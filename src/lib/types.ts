export type BookFormat = 'epub' | 'pdf' | 'txt' | 'md';
export type ReadingStatus = 'reading' | 'completed' | 'want_to_read';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  format: BookFormat;
  fileSize: number;
  totalWords: number;
  totalChapters: number;
  status: ReadingStatus;
  readingProgress: number; // 0 to 100 percentage
  currentChapterIndex: number;
  currentParagraphIndex: number;
  currentWordIndex: number;
  currentAudioTimestamp: number;
  lastReadAt: number;
  createdAt: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  order: number;
  title: string;
  content: string; // HTML formatted string with data-p-idx attributes
  rawText: string; // Plain text stripped of markup for TTS and search
  wordCount: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  snippet: string;
  createdAt: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'purple';

export interface Highlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  selectedText: string;
  color: HighlightColor;
  note?: string;
  createdAt: number;
}

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  charStart: number;
  charEnd: number;
  paragraphIndex: number;
  sentenceIndex: number;
}

export interface AudioCacheEntry {
  id: string; // `${bookId}-${chapterIndex}-${voiceId}`
  bookId: string;
  chapterIndex: number;
  voiceId: string;
  audioBlob: Blob;
  wordTimestamps: WordTimestamp[];
  createdAt: number;
}

export type ReaderTheme = 'light' | 'sepia' | 'cream' | 'dark' | 'amoled';
export type ReaderFont = 'literata' | 'merriweather' | 'inter' | 'opendyslexic';
export type ColumnWidth = 'narrow' | 'standard' | 'wide';
export type TTSProvider = 'browser' | 'elevenlabs' | 'openai';

export interface UserSettings {
  id: string; // 'user_settings'
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number; // 14 to 32, default 18
  lineHeight: number; // 1.4 to 2.2, default 1.75
  columnWidth: ColumnWidth;
  textAlign: 'left' | 'justify';
  ttsProvider: TTSProvider;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId: string;
  openAiApiKey?: string;
  openAiVoice: string;
  browserVoiceURI?: string;
  playbackSpeed: number; // 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
  pitch: number; // 0.8 to 1.2, default 1.0
  autoScroll: boolean;
  highlightMode: 'word' | 'sentence' | 'both';
}

export interface ParsedChapter {
  title: string;
  content: string;
  rawText: string;
  order: number;
  wordCount: number;
}

export interface ParsedBookResult {
  title: string;
  author: string;
  coverUrl?: string;
  format: BookFormat;
  totalWords: number;
  chapters: ParsedChapter[];
}

export interface ReadingState {
  bookId: string;
  chapterIndex: number;
  paragraphIndex: number;
  wordIndex: number;
  audioTimestamp: number;
  isPlaying: boolean;
  activeWord?: string;
  activeSentence?: string;
}
