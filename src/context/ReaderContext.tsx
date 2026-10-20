'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Book, Chapter, Bookmark, Highlight, UserSettings, ReaderTheme, ReaderFont, ColumnWidth } from '@/lib/types';
import { db, DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '@/lib/db';
import { tokenizeChapterText, findTokenByCharIndex, ChapterTokens, ParsedWordToken, ParsedSentenceToken } from '@/lib/audio/tokenAligner';
import { BrowserSpeechController, SpeechVoiceInfo } from '@/lib/audio/speechSynthesizer';

interface ReaderContextValue {
  // Active Book & Chapters
  activeBook: Book | null;
  chapters: Chapter[];
  currentChapterIndex: number;
  currentChapter: Chapter | null;
  loadBook: (bookId: string) => Promise<boolean>;
  goToChapter: (order: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;

  // Reading & Alignment state
  currentParagraphIndex: number;
  currentWordIndex: number;
  activeSentence: ParsedSentenceToken | null;
  activeWord: ParsedWordToken | null;
  chapterTokens: ChapterTokens | null;
  jumpToParagraph: (pIdx: number) => void;
  jumpToWord: (charStart: number) => void;

  // Audio Playback
  isPlaying: boolean;
  isPaused: boolean;
  playAudio: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  togglePlayPause: () => void;
  seekRelative: (secondsOffset: number) => void;

  // Voices & Settings
  availableVoices: SpeechVoiceInfo[];
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Mini Reader Dock
  isMiniDockOpen: boolean;
  setIsMiniDockOpen: (open: boolean) => void;

  // Bookmarks & Highlights
  bookmarks: Bookmark[];
  highlights: Highlight[];
  addBookmark: (snippet?: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  addHighlight: (selectedText: string, color: Highlight['color'], note?: string) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;

  // Auto-scroll
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined);

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);

  const [chapterTokens, setChapterTokens] = useState<ChapterTokens | null>(null);
  const [activeSentence, setActiveSentence] = useState<ParsedSentenceToken | null>(null);
  const [activeWord, setActiveWord] = useState<ParsedWordToken | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechVoiceInfo[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isMiniDockOpen, setIsMiniDockOpen] = useState<boolean>(false);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const speechControllerRef = useRef<BrowserSpeechController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastCharIndexRef = useRef<number>(0);

  // Initialize Speech Controller & Settings
  useEffect(() => {
    speechControllerRef.current = new BrowserSpeechController();

    const loadInitialSettings = async () => {
      const stored = await getStoredSettings();
      setSettings(stored);
      if (speechControllerRef.current) {
        speechControllerRef.current.setRate(stored.playbackSpeed);
        speechControllerRef.current.setPitch(stored.pitch);
        if (stored.browserVoiceURI) {
          speechControllerRef.current.setVoice(stored.browserVoiceURI);
        }
      }
    };
    loadInitialSettings();

    const updateVoices = () => {
      if (speechControllerRef.current) {
        const v = speechControllerRef.current.getVoices();
        setAvailableVoices(v);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      speechControllerRef.current?.stop();
    };
  }, []);

  // Sync settings updates
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = await saveStoredSettings(newSettings);
    setSettings(updated);

    if (speechControllerRef.current) {
      if (newSettings.playbackSpeed !== undefined) {
        speechControllerRef.current.setRate(newSettings.playbackSpeed);
      }
      if (newSettings.pitch !== undefined) {
        speechControllerRef.current.setPitch(newSettings.pitch);
      }
      if (newSettings.browserVoiceURI !== undefined) {
        speechControllerRef.current.setVoice(newSettings.browserVoiceURI);
      }
    }
  };

  // Load a book by ID
  const loadBook = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const book = await db.books.get(bookId);
      if (!book) return false;

      const bookChapters = await db.chapters.where('bookId').equals(bookId).sortBy('order');
      if (bookChapters.length === 0) return false;

      setActiveBook(book);
      setChapters(bookChapters);

      const targetChIndex = Math.min(Math.max(0, book.currentChapterIndex || 0), bookChapters.length - 1);
      setCurrentChapterIndex(targetChIndex);
      setCurrentParagraphIndex(book.currentParagraphIndex || 0);

      // Load Bookmarks & Highlights
      const bmarks = await db.bookmarks.where('bookId').equals(bookId).toArray();
      const hlights = await db.highlights.where('bookId').equals(bookId).toArray();
      setBookmarks(bmarks);
      setHighlights(hlights);

      return true;
    } catch (err) {
      console.error('Failed to load book:', err);
      return false;
    }
  }, []);

  // Current Chapter helper
  const currentChapter = chapters[currentChapterIndex] || null;

  // When current chapter changes, tokenize text and reset active highlighting
  useEffect(() => {
    if (!currentChapter) {
      setChapterTokens(null);
      setActiveWord(null);
      setActiveSentence(null);
      return;
    }

    // Tokenize text for karaoke sync
    const tokens = tokenizeChapterText(currentChapter.rawText);
    setChapterTokens(tokens);
    setActiveWord(null);
    setActiveSentence(null);

    // If speech is playing, restart for new chapter
    if (isPlaying) {
      speechControllerRef.current?.stop();
      playAudio();
    }
  }, [currentChapter?.id]);

  // Persist reading position to Dexie
  const persistProgress = useCallback(
    async (pIdx: number, wIdx: number, charOffset: number) => {
      if (!activeBook || !chapters.length) return;

      const totalChapters = chapters.length;
      const chapterWeight = 100 / totalChapters;
      const chapterProg = chapterTokens?.words?.length
        ? (wIdx / chapterTokens.words.length) * chapterWeight
        : 0;
      const progressPercent = Math.min(100, Math.round(currentChapterIndex * chapterWeight + chapterProg));

      await db.books.update(activeBook.id, {
        currentChapterIndex,
        currentParagraphIndex: pIdx,
        currentWordIndex: wIdx,
        currentAudioTimestamp: charOffset,
        readingProgress: progressPercent,
        lastReadAt: Date.now(),
      });
    },
    [activeBook, chapters.length, currentChapterIndex, chapterTokens]
  );

  // Auto-scroll to active sentence / word element
  const scrollToActiveElement = useCallback(
    (pIdx: number) => {
      if (!settings.autoScroll) return;

      // Locate paragraph element
      const el = document.querySelector(`[data-p-idx="${pIdx}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [settings.autoScroll]
  );

  // Play Audio (Browser Speech by default)
  const playAudio = useCallback(() => {
    if (!currentChapter || !speechControllerRef.current) return;

    const rawText = currentChapter.rawText;
    if (!rawText.trim()) return;

    // Determine starting character offset
    let startCharOffset = 0;
    if (chapterTokens && currentParagraphIndex > 0 && currentParagraphIndex < chapterTokens.paragraphStarts.length) {
      startCharOffset = chapterTokens.paragraphStarts[currentParagraphIndex] || 0;
    }

    setIsPlaying(true);
    setIsPaused(false);

    speechControllerRef.current.play(rawText, startCharOffset, {
      onBoundary: ({ charIndex }) => {
        lastCharIndexRef.current = charIndex;
        if (!chapterTokens) return;

        const { word, sentence } = findTokenByCharIndex(chapterTokens, charIndex);
        if (word) {
          setActiveWord(word);
          setCurrentWordIndex(word.wordIndex);
          if (word.paragraphIndex !== currentParagraphIndex) {
            setCurrentParagraphIndex(word.paragraphIndex);
            scrollToActiveElement(word.paragraphIndex);
            persistProgress(word.paragraphIndex, word.wordIndex, charIndex);
          }
        }
        if (sentence) {
          setActiveSentence(sentence);
        }
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActiveWord(null);
        setActiveSentence(null);
        // Advance to next chapter automatically if available
        if (currentChapterIndex < chapters.length - 1) {
          goToChapter(currentChapterIndex + 1);
        }
      },
      onError: (err) => {
        console.warn('Speech controller error:', err);
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  }, [currentChapter, chapterTokens, currentParagraphIndex, currentChapterIndex, chapters.length, scrollToActiveElement, persistProgress]);

  const pauseAudio = useCallback(() => {
    speechControllerRef.current?.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const resumeAudio = useCallback(() => {
    speechControllerRef.current?.resume();
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const stopAudio = useCallback(() => {
    speechControllerRef.current?.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveWord(null);
    setActiveSentence(null);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else if (isPaused) {
      resumeAudio();
    } else {
      playAudio();
    }
  }, [isPlaying, isPaused, pauseAudio, resumeAudio, playAudio]);

  const seekRelative = useCallback(
    (secondsOffset: number) => {
      if (!chapterTokens) return;
      // Approximate 3 words per second
      const wordsJump = Math.round(secondsOffset * 3);
      const targetWordIdx = Math.max(0, Math.min(chapterTokens.words.length - 1, currentWordIndex + wordsJump));
      const targetWord = chapterTokens.words[targetWordIdx];
      if (targetWord) {
        jumpToWord(targetWord.charStart);
      }
    },
    [chapterTokens, currentWordIndex]
  );

  const jumpToParagraph = useCallback(
    (pIdx: number) => {
      if (!chapterTokens) return;
      const charOffset = chapterTokens.paragraphStarts[pIdx] || 0;
      setCurrentParagraphIndex(pIdx);
      scrollToActiveElement(pIdx);

      if (speechControllerRef.current && (isPlaying || isPaused)) {
        speechControllerRef.current.seekTo(charOffset);
      }
      persistProgress(pIdx, 0, charOffset);
    },
    [chapterTokens, isPlaying, isPaused, scrollToActiveElement, persistProgress]
  );

  const jumpToWord = useCallback(
    (charStart: number) => {
      if (!chapterTokens) return;
      const { word, sentence } = findTokenByCharIndex(chapterTokens, charStart);
      if (word) {
        setActiveWord(word);
        setCurrentParagraphIndex(word.paragraphIndex);
        setCurrentWordIndex(word.wordIndex);
        scrollToActiveElement(word.paragraphIndex);
        persistProgress(word.paragraphIndex, word.wordIndex, charStart);
      }
      if (sentence) {
        setActiveSentence(sentence);
      }
      if (speechControllerRef.current && (isPlaying || isPaused)) {
        speechControllerRef.current.seekTo(charStart);
      } else if (!isPlaying) {
        // Start playback from this word
        if (!currentChapter) return;
        speechControllerRef.current?.play(currentChapter.rawText, charStart, {
          onBoundary: ({ charIndex }) => {
            const res = findTokenByCharIndex(chapterTokens, charIndex);
            if (res.word) {
              setActiveWord(res.word);
              setCurrentWordIndex(res.word.wordIndex);
              if (res.word.paragraphIndex !== currentParagraphIndex) {
                setCurrentParagraphIndex(res.word.paragraphIndex);
                scrollToActiveElement(res.word.paragraphIndex);
              }
            }
            if (res.sentence) setActiveSentence(res.sentence);
          },
        });
        setIsPlaying(true);
        setIsPaused(false);
      }
    },
    [chapterTokens, currentChapter, isPlaying, isPaused, currentParagraphIndex, scrollToActiveElement, persistProgress]
  );

  const goToChapter = useCallback(
    (order: number) => {
      if (order < 0 || order >= chapters.length) return;
      speechControllerRef.current?.stop();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentChapterIndex(order);
      setCurrentParagraphIndex(0);
      setCurrentWordIndex(0);
      setActiveWord(null);
      setActiveSentence(null);

      if (activeBook) {
        db.books.update(activeBook.id, {
          currentChapterIndex: order,
          currentParagraphIndex: 0,
          currentWordIndex: 0,
          lastReadAt: Date.now(),
        });
      }
    },
    [chapters.length, activeBook]
  );

  const nextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  }, [currentChapterIndex, chapters.length, goToChapter]);

  const prevChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
    }
  }, [currentChapterIndex, goToChapter]);

  // Bookmarks
  const addBookmark = async (snippet?: string) => {
    if (!activeBook || !currentChapter) return;
    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId: activeBook.id,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapter.title,
      paragraphIndex: currentParagraphIndex,
      snippet: snippet || activeSentence?.text || currentChapter.rawText.slice(0, 100) + '...',
      createdAt: Date.now(),
    };
    await db.bookmarks.add(newBookmark);
    setBookmarks((prev) => [newBookmark, ...prev]);
  };

  const removeBookmark = async (id: string) => {
    await db.bookmarks.delete(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  // Highlights
  const addHighlight = async (selectedText: string, color: Highlight['color'], note?: string) => {
    if (!activeBook || !currentChapter || !selectedText.trim()) return;
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId: activeBook.id,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapter.title,
      paragraphIndex: currentParagraphIndex,
      selectedText,
      color,
      note,
      createdAt: Date.now(),
    };
    await db.highlights.add(newHighlight);
    setHighlights((prev) => [newHighlight, ...prev]);
  };

  const removeHighlight = async (id: string) => {
    await db.highlights.delete(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const value: ReaderContextValue = {
    activeBook,
    chapters,
    currentChapterIndex,
    currentChapter,
    loadBook,
    goToChapter,
    nextChapter,
    prevChapter,

    currentParagraphIndex,
    currentWordIndex,
    activeSentence,
    activeWord,
    chapterTokens,
    jumpToParagraph,
    jumpToWord,

    isPlaying,
    isPaused,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    togglePlayPause,
    seekRelative,

    availableVoices,
    settings,
    updateSettings,

    isMiniDockOpen,
    setIsMiniDockOpen,

    bookmarks,
    highlights,
    addBookmark,
    removeBookmark,
    addHighlight,
    removeHighlight,

    scrollContainerRef,
  };

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
}
