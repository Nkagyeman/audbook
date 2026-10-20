import { ParsedBookResult, ParsedChapter } from '../types';

export async function parsePdfFile(file: File | Blob): Promise<ParsedBookResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamic import of pdfjs-dist
  const pdfjs = await import('pdfjs-dist');

  // Configure worker
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.10.38'}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // Extract metadata
  let title = 'Untitled Document';
  let author = 'Unknown Author';
  try {
    const meta = await pdfDoc.getMetadata();
    const info = meta.info as Record<string, unknown> | undefined;
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 0) {
      title = info.Title.trim();
    } else if (file instanceof File && file.name) {
      title = file.name.replace(/\.[^/.]+$/, '');
    }
    if (info?.Author && typeof info.Author === 'string' && info.Author.trim().length > 0) {
      author = info.Author.trim();
    }
  } catch {
    if (file instanceof File && file.name) {
      title = file.name.replace(/\.[^/.]+$/, '');
    }
  }

  // Generate cover thumbnail from first page
  let coverUrl: string | undefined = undefined;
  if (typeof window !== 'undefined' && numPages >= 1) {
    try {
      const page1 = await pdfDoc.getPage(1);
      const viewport = page1.getViewport({ scale: 1 });
      const targetWidth = 320;
      const scale = targetWidth / viewport.width;
      const scaledViewport = page1.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page1.render({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas: canvas as any,
        } as any).promise;
        coverUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn('Could not generate PDF cover thumbnail:', e);
    }
  }

  // Check for outline bookmarks
  let outline: any[] | null = null;
  try {
    outline = await pdfDoc.getOutline();
  } catch {
    outline = null;
  }

  // Extract text and page items
  interface PageTextData {
    pageNumber: number;
    lines: string[];
    headings: string[];
  }

  const pageData: PageTextData[] = [];
  let totalWordCount = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str: string; hasEOL?: boolean; height?: number }>;

    let currentPageText = '';
    const headings: string[] = [];

    // Simple line grouping
    let lineBuffer = '';
    for (const item of items) {
      const str = item.str || '';
      if (!str) continue;

      // Check if text item looks like a heading
      if (item.height && item.height > 14 && str.trim().length > 2) {
        const potentialHeading = str.trim();
        if (/^(chapter|section|part|\d+\b|prologue|epilogue|introduction)/i.test(potentialHeading)) {
          headings.push(potentialHeading);
        }
      }

      lineBuffer += str;
      if (item.hasEOL || str.endsWith(' ') || str.endsWith('\n')) {
        lineBuffer += ' ';
      }
    }

    // Clean hyphenation at end of lines
    currentPageText = lineBuffer
      .replace(/-\s+/g, '') // join hyphenated words
      .replace(/\s+/g, ' ')
      .trim();

    const words = currentPageText.split(/\s+/).filter(Boolean);
    totalWordCount += words.length;

    pageData.push({
      pageNumber: i,
      lines: currentPageText ? [currentPageText] : [],
      headings,
    });
  }

  // Construct structured chapters
  const chapters: ParsedChapter[] = [];

  // If outline exists with titles and destinations, try to map page boundaries
  if (outline && outline.length > 0) {
    for (let oIdx = 0; oIdx < outline.length; oIdx++) {
      const item = outline[oIdx];
      const title = item.title || `Section ${oIdx + 1}`;
      
      // Determine page index for outline item
      let startPage = 1;
      try {
        if (typeof item.dest === 'string') {
          const destRef = await pdfDoc.getDestination(item.dest);
          if (destRef && destRef[0]) {
            startPage = (await pdfDoc.getPageIndex(destRef[0])) + 1;
          }
        } else if (Array.isArray(item.dest) && item.dest[0]) {
          startPage = (await pdfDoc.getPageIndex(item.dest[0])) + 1;
        }
      } catch {
        startPage = Math.max(1, Math.min(numPages, Math.floor((oIdx / outline.length) * numPages) + 1));
      }

      // Next item's start page
      let endPage = numPages;
      if (oIdx + 1 < outline.length) {
        const nextItem = outline[oIdx + 1];
        try {
          if (typeof nextItem.dest === 'string') {
            const destRef = await pdfDoc.getDestination(nextItem.dest);
            if (destRef && destRef[0]) {
              endPage = (await pdfDoc.getPageIndex(destRef[0])) + 1;
            }
          } else if (Array.isArray(nextItem.dest) && nextItem.dest[0]) {
            endPage = (await pdfDoc.getPageIndex(nextItem.dest[0])) + 1;
          }
        } catch {
          endPage = numPages;
        }
      }

      const chapterPages = pageData.filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage);
      const textBlocks = chapterPages.map((p) => p.lines.join('\n')).filter((t) => t.trim().length > 0);
      const chapterRaw = textBlocks.join('\n\n');
      const chapterWords = chapterRaw.split(/\s+/).filter(Boolean).length;

      const structuredHtml = textBlocks
        .map((tb, idx) => `<p data-p-idx="${idx}" class="leading-relaxed my-3">${tb}</p>`)
        .join('\n');

      chapters.push({
        title,
        content: structuredHtml || `<p data-p-idx="0">No text on pages ${startPage}-${endPage}.</p>`,
        rawText: chapterRaw,
        order: oIdx,
        wordCount: chapterWords,
      });
    }
  }

  // Fallback: If no outline or outline yielded zero chapters, segment by detected headings or page chunks
  if (chapters.length === 0) {
    let currentChapterTitle = 'Part 1: Beginning';
    let currentParagraphs: string[] = [];
    let currentRawTexts: string[] = [];
    let chapterOrder = 0;

    for (let pIdx = 0; pIdx < pageData.length; pIdx++) {
      const page = pageData[pIdx];
      const pageText = page.lines.join(' ').trim();
      if (!pageText) continue;

      // Check if page starts a new chapter
      const hasHeading = page.headings.length > 0;
      const isEveryFivePages = pIdx > 0 && pIdx % 5 === 0;

      if ((hasHeading || isEveryFivePages) && currentParagraphs.length > 0) {
        // Save current chapter
        const raw = currentRawTexts.join('\n\n');
        chapters.push({
          title: currentChapterTitle,
          content: currentParagraphs.join('\n'),
          rawText: raw,
          order: chapterOrder++,
          wordCount: raw.split(/\s+/).filter(Boolean).length,
        });

        currentChapterTitle = page.headings[0] || `Pages ${page.pageNumber}-${Math.min(page.pageNumber + 4, numPages)}`;
        currentParagraphs = [];
        currentRawTexts = [];
      }

      const pIndexInChapter = currentParagraphs.length;
      currentParagraphs.push(`<p data-p-idx="${pIndexInChapter}" class="leading-relaxed my-3">${pageText}</p>`);
      currentRawTexts.push(pageText);
    }

    if (currentParagraphs.length > 0) {
      const raw = currentRawTexts.join('\n\n');
      chapters.push({
        title: currentChapterTitle,
        content: currentParagraphs.join('\n'),
        rawText: raw,
        order: chapterOrder++,
        wordCount: raw.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  return {
    title,
    author,
    coverUrl,
    format: 'pdf',
    totalWords: totalWordCount,
    chapters: chapters.length > 0 ? chapters : [
      {
        title: 'Document Content',
        content: '<p data-p-idx="0">No readable text found in document.</p>',
        rawText: 'No readable text found in document.',
        order: 0,
        wordCount: 6,
      }
    ],
  };
}
