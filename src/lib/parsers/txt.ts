import { ParsedBookResult, ParsedChapter } from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function parseTxtFile(file: File | Blob): Promise<ParsedBookResult> {
  const text = await file.text();
  const fileName = file instanceof File ? file.name.replace(/\.[^/.]+$/, '') : 'Untitled Text';
  
  // Normalise line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  let title = fileName;
  let author = 'Unknown Author';

  // Heuristic: Check if first 3 lines contain title or author
  if (lines.length > 0 && lines[0].startsWith('# ')) {
    title = lines[0].replace(/^#\s+/, '').trim();
  }

  // Regex for chapter detection: Markdown headings or Chapter keywords
  const chapterRegex = /^(?:#{1,3}\s+|chapter\s+[0-9ivxlcdm]+|part\s+[0-9ivxlcdm]+|section\s+[0-9ivxlcdm]+|prologue|epilogue|act\s+[0-9ivxlcdm]+)/i;

  const rawChapters: Array<{ title: string; lines: string[] }> = [];
  let currentTitle = 'Introduction';
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (chapterRegex.test(line)) {
      if (currentLines.length > 0) {
        rawChapters.push({
          title: currentTitle,
          lines: currentLines,
        });
      }
      currentTitle = line.replace(/^#{1,3}\s+/, '').trim();
      currentLines = [];
    } else {
      currentLines.push(lines[i]);
    }
  }

  if (currentLines.length > 0) {
    rawChapters.push({
      title: currentTitle,
      lines: currentLines,
    });
  }

  // If no chapters were detected, split into reasonable word segments (~1200 words)
  let structuredChapters: ParsedChapter[] = [];
  let totalWordCount = 0;

  if (rawChapters.length <= 1) {
    const allParagraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
    const chapterChunkSize = 15; // 15 paragraphs per chapter
    let chunkIdx = 0;

    for (let i = 0; i < allParagraphs.length; i += chapterChunkSize) {
      const slice = allParagraphs.slice(i, i + chapterChunkSize);
      const rawText = slice.join('\n\n');
      const words = rawText.split(/\s+/).filter(Boolean).length;
      totalWordCount += words;

      const html = slice
        .map((p, pIdx) => `<p data-p-idx="${pIdx}" class="leading-relaxed my-3">${escapeHtml(p)}</p>`)
        .join('\n');

      structuredChapters.push({
        title: allParagraphs.length > chapterChunkSize ? `Chapter ${chunkIdx + 1}` : (title || 'Complete Text'),
        content: html,
        rawText,
        order: chunkIdx,
        wordCount: words,
      });
      chunkIdx++;
    }
  } else {
    structuredChapters = rawChapters.map((rc, order) => {
      const textBlock = rc.lines.join('\n');
      const paragraphs = textBlock.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
      const rawText = paragraphs.join('\n\n');
      const words = rawText.split(/\s+/).filter(Boolean).length;
      totalWordCount += words;

      const html = paragraphs
        .map((p, pIdx) => `<p data-p-idx="${pIdx}" class="leading-relaxed my-3">${escapeHtml(p)}</p>`)
        .join('\n');

      return {
        title: rc.title || `Chapter ${order + 1}`,
        content: html || `<p data-p-idx="0">Empty section</p>`,
        rawText: rawText || 'Empty section',
        order,
        wordCount: words,
      };
    });
  }

  return {
    title,
    author,
    format: file instanceof File && file.name.endsWith('.md') ? 'md' : 'txt',
    totalWords: totalWordCount,
    chapters: structuredChapters,
  };
}
