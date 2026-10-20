import JSZip from 'jszip';
import { ParsedBookResult, ParsedChapter } from '../types';

function cleanXmlText(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function resolvePath(base: string, relative: string): string {
  const stack = base.split('/').filter(Boolean);
  stack.pop(); // Remove the current filename, keep directory
  const parts = relative.split('/');

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

export async function parseEpubFile(file: File | Blob): Promise<ParsedBookResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Locate container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid EPUB: Missing META-INF/container.xml');
  }

  const containerXml = await containerFile.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path') || 'OEBPS/content.opf';

  // 2. Read OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: Missing OPF file at ${opfPath}`);
  }

  const opfXml = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Metadata extraction
  const title = opfDoc.querySelector('title')?.textContent?.trim() || 'Untitled Book';
  const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Unknown Author';

  // Manifest mapping
  const manifestItems: Record<string, { href: string; mediaType: string; properties: string }> = {};
  opfDoc.querySelectorAll('manifest > item').forEach((el) => {
    const id = el.getAttribute('id');
    const href = el.getAttribute('href');
    const mediaType = el.getAttribute('media-type') || '';
    const properties = el.getAttribute('properties') || '';
    if (id && href) {
      manifestItems[id] = { href, mediaType, properties };
    }
  });

  // Cover image extraction
  let coverUrl: string | undefined = undefined;
  let coverHref: string | null = null;

  // Check 1: properties="cover-image"
  for (const id in manifestItems) {
    if (manifestItems[id].properties.includes('cover-image')) {
      coverHref = manifestItems[id].href;
      break;
    }
  }

  // Check 2: <meta name="cover" content="{id}">
  if (!coverHref) {
    const metaCover = opfDoc.querySelector('meta[name="cover"]');
    const coverId = metaCover?.getAttribute('content');
    if (coverId && manifestItems[coverId]) {
      coverHref = manifestItems[coverId].href;
    }
  }

  // Check 3: id or href matching cover
  if (!coverHref) {
    for (const id in manifestItems) {
      if (/cover/i.test(id) && manifestItems[id].mediaType.startsWith('image/')) {
        coverHref = manifestItems[id].href;
        break;
      }
    }
  }

  if (coverHref) {
    const fullCoverPath = resolvePath(opfPath, coverHref);
    const coverImgFile = zip.file(fullCoverPath) || zip.file(coverHref);
    if (coverImgFile) {
      const mime = manifestItems[coverHref]?.mediaType || 'image/jpeg';
      const base64 = await coverImgFile.async('base64');
      coverUrl = `data:${mime};base64,${base64}`;
    }
  }

  // Spine extraction (reading order)
  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((el) => el.getAttribute('idref'))
    .filter(Boolean) as string[];

  // TOC extraction (NCX or EPUB 3 Nav)
  const tocTitlesByHref: Record<string, string> = {};

  // Try EPUB 3 Nav doc first
  let navItemId: string | null = null;
  for (const id in manifestItems) {
    if (manifestItems[id].properties.includes('nav')) {
      navItemId = id;
      break;
    }
  }

  if (navItemId && manifestItems[navItemId]) {
    const navPath = resolvePath(opfPath, manifestItems[navItemId].href);
    const navFile = zip.file(navPath);
    if (navFile) {
      try {
        const navHtml = await navFile.async('text');
        const navDoc = parser.parseFromString(navHtml, 'text/html');
        navDoc.querySelectorAll('nav a').forEach((a) => {
          const href = a.getAttribute('href');
          const text = a.textContent?.trim();
          if (href && text) {
            const cleanHref = href.split('#')[0];
            tocTitlesByHref[cleanHref] = text;
          }
        });
      } catch {
        // ignore nav parsing error and fallback
      }
    }
  }

  // Try EPUB 2 NCX
  let ncxId: string | null = null;
  for (const id in manifestItems) {
    if (manifestItems[id].mediaType.includes('ncx') || id.toLowerCase() === 'ncx') {
      ncxId = id;
      break;
    }
  }

  if (ncxId && manifestItems[ncxId]) {
    const ncxPath = resolvePath(opfPath, manifestItems[ncxId].href);
    const ncxFile = zip.file(ncxPath);
    if (ncxFile) {
      try {
        const ncxXml = await ncxFile.async('text');
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        ncxDoc.querySelectorAll('navPoint').forEach((point) => {
          const text = point.querySelector('navLabel > text')?.textContent?.trim();
          const src = point.querySelector('content')?.getAttribute('src');
          if (src && text) {
            const cleanSrc = src.split('#')[0];
            if (!tocTitlesByHref[cleanSrc]) {
              tocTitlesByHref[cleanSrc] = text;
            }
          }
        });
      } catch {
        // ignore NCX error
      }
    }
  }

  // Process spine chapters
  const chapters: ParsedChapter[] = [];
  let chapterIndex = 0;
  let totalWordCount = 0;

  for (const idref of spineItemRefs) {
    const item = manifestItems[idref];
    if (!item) continue;

    // Skip non-HTML files
    if (!item.mediaType.includes('html') && !item.mediaType.includes('xhtml') && !item.mediaType.includes('xml')) {
      continue;
    }

    const chapterPath = resolvePath(opfPath, item.href);
    const chapterFile = zip.file(chapterPath) || zip.file(item.href);
    if (!chapterFile) continue;

    const rawHtml = await chapterFile.async('text');
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove scripts and styles
    doc.querySelectorAll('script, style, noscript, link[rel="stylesheet"]').forEach((el) => el.remove());

    // Resolve inline images to base64 Data URLs so images work offline
    const imgElements = Array.from(doc.querySelectorAll('img, image'));
    for (const img of imgElements) {
      const src = img.getAttribute('src') || img.getAttribute('xlink:href');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        const resolvedImgPath = resolvePath(chapterPath, src);
        const imgFile = zip.file(resolvedImgPath) || zip.file(src);
        if (imgFile) {
          try {
            const ext = src.split('.').pop()?.toLowerCase() || 'jpg';
            const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
            const base64 = await imgFile.async('base64');
            img.setAttribute('src', `data:${mime};base64,${base64}`);
          } catch {
            // keep src as is
          }
        }
      }
    }

    // Determine chapter title
    let titleCandidate = tocTitlesByHref[item.href] || tocTitlesByHref[item.href.split('/').pop() || ''];
    if (!titleCandidate) {
      const firstHeading = doc.querySelector('h1, h2, h3, .chapter-title, .title');
      if (firstHeading && firstHeading.textContent?.trim()) {
        titleCandidate = firstHeading.textContent.trim();
      }
    }

    // Extract text blocks
    const body = doc.body;
    if (!body) continue;

    // Extract blocks (<p>, <h1>-<h6>, <blockquote>, <ul>, <ol>, <div>)
    const blockNodes = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li'));
    const validParagraphs: string[] = [];
    const plainParagraphs: string[] = [];

    if (blockNodes.length > 0) {
      blockNodes.forEach((node) => {
        const text = node.textContent?.trim();
        if (text && text.length > 2) {
          const tagName = node.tagName.toLowerCase();
          const isHeading = tagName.startsWith('h');
          const isQuote = tagName === 'blockquote';
          
          if (isHeading) {
            validParagraphs.push(`<${tagName} class="chapter-heading text-xl font-bold tracking-tight my-4">${cleanXmlText(text)}</${tagName}>`);
          } else if (isQuote) {
            validParagraphs.push(`<blockquote class="border-l-2 pl-4 italic my-3 opacity-90">${cleanXmlText(text)}</blockquote>`);
          } else {
            validParagraphs.push(`<p class="leading-relaxed my-3">${cleanXmlText(text)}</p>`);
          }
          plainParagraphs.push(cleanXmlText(text));
        }
      });
    } else {
      // Fallback: Split body text by double newlines
      const rawText = body.textContent || '';
      const parts = rawText.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 5);
      parts.forEach((p) => {
        validParagraphs.push(`<p class="leading-relaxed my-3">${cleanXmlText(p)}</p>`);
        plainParagraphs.push(cleanXmlText(p));
      });
    }

    const chapterPlain = plainParagraphs.join('\n\n');
    const words = chapterPlain.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Filter out empty or negligible utility pages (e.g. 0-10 words with no title)
    if (wordCount < 15 && !titleCandidate) {
      continue;
    }

    totalWordCount += wordCount;

    // Format content with explicit data-p-idx attributes for sentence & word tracking
    const structuredContent = validParagraphs
      .map((p, idx) => {
        return p.replace(/<([a-z0-9]+)/, `<$1 data-p-idx="${idx}"`);
      })
      .join('\n');

    chapters.push({
      title: titleCandidate || `Chapter ${chapterIndex + 1}`,
      content: structuredContent,
      rawText: chapterPlain,
      order: chapterIndex,
      wordCount,
    });

    chapterIndex++;
  }

  // If no chapters were parsed, create a fallback chapter
  if (chapters.length === 0) {
    chapters.push({
      title: 'Chapter 1',
      content: '<p data-p-idx="0">No readable text content found in this EPUB document.</p>',
      rawText: 'No readable text content found in this EPUB document.',
      order: 0,
      wordCount: 9,
    });
  }

  return {
    title,
    author,
    coverUrl,
    format: 'epub',
    totalWords: totalWordCount,
    chapters,
  };
}
