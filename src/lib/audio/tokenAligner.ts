export interface ParsedWordToken {
  word: string;         // clean alphanumeric word for phonetic speech lookup
  rawWord: string;      // exact token as in text (includes punctuation, e.g. "man's", "well-known,")
  trailingSpace: string;// whitespace following this word in the text, usually " "
  charStart: number;    // global character start offset
  charEnd: number;      // global character end offset
  paragraphIndex: number;
  sentenceIndex: number;
  wordIndex: number;    // unique global word index across the entire chapter
  startTime?: number;   // audio alignment time in seconds
  endTime?: number;
}

export interface ParsedSentenceToken {
  text: string;
  charStart: number;
  charEnd: number;
  paragraphIndex: number;
  sentenceIndex: number;
  words: ParsedWordToken[];
  trailingSpace: string;
  startTime?: number;
  endTime?: number;
}

export interface ParsedParagraph {
  paragraphIndex: number;
  sentences: ParsedSentenceToken[];
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ChapterTokens {
  fullText: string;
  words: ParsedWordToken[];
  sentences: ParsedSentenceToken[];
  paragraphs: ParsedParagraph[];
  paragraphStarts: number[]; // charIndex where each paragraph begins
}

/**
 * Splits raw chapter text into mapped word and sentence tokens with precise character offsets
 */
export function tokenizeChapterText(rawText: string): ChapterTokens {
  const rawParagraphs = rawText.split(/\n\s*\n/);
  const words: ParsedWordToken[] = [];
  const sentences: ParsedSentenceToken[] = [];
  const paragraphs: ParsedParagraph[] = [];
  const paragraphStarts: number[] = [];

  let globalCharOffset = 0;
  let globalWordIndex = 0;
  let globalSentenceIndex = 0;

  rawParagraphs.forEach((para, pIdx) => {
    paragraphStarts.push(globalCharOffset);
    const paraClean = para.trim();
    if (!paraClean) {
      globalCharOffset += para.length + 2; // account for newlines
      return;
    }

    // Sentence splitting: Split by punctuation followed by space or quote
    const sentenceRegex = /([^\.!\?]+[\.!\?]+["']?|.+)/g;
    let sMatch: RegExpExecArray | null;
    const paraSentences: ParsedSentenceToken[] = [];

    while ((sMatch = sentenceRegex.exec(paraClean)) !== null) {
      const sentenceText = sMatch[0];
      if (!sentenceText.trim()) continue;

      const sentenceLocalStart = sMatch.index;
      const sentenceGlobalStart = globalCharOffset + sentenceLocalStart;
      const sentenceGlobalEnd = sentenceGlobalStart + sentenceText.length;

      const sentenceWords: ParsedWordToken[] = [];
      const currentSentenceIndex = globalSentenceIndex++;

      // Tokenize words within this sentence, capturing non-space words and their trailing spaces
      const tokenRegex = /(\S+)(\s*)/g;
      let wMatch: RegExpExecArray | null;

      while ((wMatch = tokenRegex.exec(sentenceText)) !== null) {
        const rawWord = wMatch[1];
        const trailingSpace = wMatch[2] || ' ';
        const cleanWord = rawWord.replace(/^[^\w\s]+|[^\w\s]+$/g, '');
        const wordLocalStart = sentenceLocalStart + wMatch.index;
        const wordGlobalStart = globalCharOffset + wordLocalStart;
        const wordGlobalEnd = wordGlobalStart + rawWord.length;

        const wordToken: ParsedWordToken = {
          word: cleanWord || rawWord,
          rawWord,
          trailingSpace,
          charStart: wordGlobalStart,
          charEnd: wordGlobalEnd,
          paragraphIndex: pIdx,
          sentenceIndex: currentSentenceIndex,
          wordIndex: globalWordIndex++,
        };

        words.push(wordToken);
        sentenceWords.push(wordToken);
      }

      const sentenceToken: ParsedSentenceToken = {
        text: sentenceText.trim(),
        charStart: sentenceGlobalStart,
        charEnd: sentenceGlobalEnd,
        paragraphIndex: pIdx,
        sentenceIndex: currentSentenceIndex,
        words: sentenceWords,
        trailingSpace: sMatch[0].endsWith(' ') ? ' ' : ' ',
      };

      sentences.push(sentenceToken);
      paraSentences.push(sentenceToken);
    }

    paragraphs.push({
      paragraphIndex: pIdx,
      sentences: paraSentences,
      text: paraClean,
      charStart: globalCharOffset,
      charEnd: globalCharOffset + paraClean.length,
    });

    globalCharOffset += para.length + 2; // account for split \n\n
  });

  return {
    fullText: rawText,
    words,
    sentences,
    paragraphs,
    paragraphStarts,
  };
}

/**
 * Finds the exact word and sentence token matching a given character offset in the text
 */
export function findTokenByCharIndex(
  tokens: ChapterTokens,
  charIndex: number
): { word?: ParsedWordToken; sentence?: ParsedSentenceToken } {
  // Find matching sentence
  const sentence = tokens.sentences.find(
    (s) => charIndex >= s.charStart && charIndex <= s.charEnd
  );

  // Find exact matching word whose [charStart, charEnd] covers charIndex
  let word = tokens.words.find(
    (w) => charIndex >= w.charStart && charIndex <= w.charEnd
  );

  // If not exact within word bounds, find closest word in that sentence
  if (!word && sentence) {
    word = tokens.words.find(
      (w) => w.sentenceIndex === sentence.sentenceIndex && w.charStart >= charIndex
    );
    if (!word) {
      // Pick the last word in that sentence
      const sentenceWords = tokens.words.filter((w) => w.sentenceIndex === sentence.sentenceIndex);
      word = sentenceWords[sentenceWords.length - 1];
    }
  }

  return { word, sentence };
}

/**
 * Maps ElevenLabs character alignment data to word & sentence tokens
 */
export function alignElevenLabsTimestamps(
  tokens: ChapterTokens,
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }
): ChapterTokens {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;

  const updatedWords = tokens.words.map((w) => ({ ...w }));
  const updatedSentences = tokens.sentences.map((s) => ({ ...s }));

  let charOffset = 0;
  for (let i = 0; i < characters.length; i++) {
    const startTime = character_start_times_seconds[i];
    const endTime = character_end_times_seconds[i];

    for (const w of updatedWords) {
      if (charOffset === w.charStart && w.startTime === undefined) {
        w.startTime = startTime;
      }
      if (charOffset + 1 >= w.charEnd && w.endTime === undefined) {
        w.endTime = endTime;
      }
    }

    charOffset++;
  }

  updatedSentences.forEach((s) => {
    const sentenceWords = updatedWords.filter((w) => w.sentenceIndex === s.sentenceIndex && w.startTime !== undefined);
    if (sentenceWords.length > 0) {
      s.startTime = sentenceWords[0].startTime;
      s.endTime = sentenceWords[sentenceWords.length - 1].endTime;
    }
  });

  return {
    ...tokens,
    words: updatedWords,
    sentences: updatedSentences,
  };
}
