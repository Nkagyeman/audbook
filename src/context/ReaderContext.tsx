'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Book, Chapter, Bookmark, Highlight, UserSettings, ReaderTheme, ReaderFont, ColumnWidth } from '@/lib/types';
import { db, DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '@/lib/db';
import { tokenizeChapterText, findTokenByCharIndex, ChapterTokens, ParsedWordToken, ParsedSentenceToken } from '@/lib/audio/tokenAligner';
import { BrowserSpeechController, SpeechVoiceInfo } from '@/lib/audio/speechSynthesizer';
import { pushProgressToCloud, fetchProgressFromCloud, supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ReaderContextValue {
  // Active Book & Chapters
  activeBook: Book | null;
  chapters: Chapter[];
  currentChapterIndex: number;
  currentChapter: Chapter | null;
  loadBook: (bookId: string) => Promise<boolean>;
  goToChapter: (order: number, targetParagraphIndex?: number, targetWordIndex?: number) => void;
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
  persistProgress: (chIdx: number, pIdx: number, wIdx: number, charOffset: number) => Promise<void>;
  setCurrentParagraphIndex: (pIdx: number) => void;

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
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Up-to-date refs to eliminate stale closure bugs during asynchronous events
  const currentChapterIndexRef = useRef<number>(0);
  const currentParagraphIndexRef = useRef<number>(0);
  const currentWordIndexRef = useRef<number>(0);
  const activeBookRef = useRef<Book | null>(null);
  const chapterTokensRef = useRef<ChapterTokens | null>(null);
  const chaptersRef = useRef<Chapter[]>([]);

  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  useEffect(() => {
    currentParagraphIndexRef.current = currentParagraphIndex;
  }, [currentParagraphIndex]);

  useEffect(() => {
    currentWordIndexRef.current = currentWordIndex;
  }, [currentWordIndex]);

  useEffect(() => {
    activeBookRef.current = activeBook;
  }, [activeBook]);

  useEffect(() => {
    chapterTokensRef.current = chapterTokens;
  }, [chapterTokens]);

  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

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

  // Robust progress persistence (IndexedDB + Synchronous localStorage)
  const persistProgress = useCallback(
    async (chIdx: number, pIdx: number, wIdx: number, charOffset: number) => {
      const targetBook = activeBookRef.current;
      const targetChapters = chaptersRef.current;
      if (!targetBook || !targetChapters.length) return;

      const totalChapters = targetChapters.length || 1;
      const chapterWeight = 100 / totalChapters;
      const tokens = chapterTokensRef.current;

      let intraFraction = 0;
      if (tokens?.words?.length && wIdx > 0) {
        intraFraction = wIdx / tokens.words.length;
      } else if (tokens?.paragraphs?.length && pIdx > 0) {
        intraFraction = pIdx / tokens.paragraphs.length;
      }

      const rawPercent = (chIdx + intraFraction) * chapterWeight;
      const progressPercent = Math.min(
        100,
        Math.max(pIdx > 0 || chIdx > 0 || wIdx > 0 ? 1 : 0, Math.round(rawPercent))
      );

      const updatePayload = {
        currentChapterIndex: chIdx,
        currentParagraphIndex: pIdx,
        currentWordIndex: wIdx,
        currentAudioTimestamp: charOffset,
        readingProgress: progressPercent,
        lastReadAt: Date.now(),
      };

      // 1. Update React state immediately
      setActiveBook((prev) => (prev ? { ...prev, ...updatePayload } : null));

      // 2. Synchronous localStorage backup (instant, never lost when closing the link)
      try {
        localStorage.setItem(`audbook_prog_${targetBook.id}`, JSON.stringify(updatePayload));
      } catch (e) {
        console.warn('Could not save progress to localStorage:', e);
      }

      // 3. Persistent IndexedDB update
      try {
        await db.books.update(targetBook.id, updatePayload);
      } catch (e) {
        console.warn('Could not save progress to Dexie:', e);
      }
    },
    []
  );

  // Hook beforeunload and visibilitychange to guarantee progress is saved even on sudden tab/window close
  useEffect(() => {
    const handleSaveOnExit = () => {
      const book = activeBookRef.current;
      if (!book) return;

      const chIdx = currentChapterIndexRef.current;
      const pIdx = currentParagraphIndexRef.current;
      const wIdx = currentWordIndexRef.current;
      const charOffset = lastCharIndexRef.current;

      // CRITICAL GUARD: Never wipe out existing non-zero progress with 0 on unmount/exit
      try {
        const existingRaw = localStorage.getItem(`audbook_prog_${book.id}`);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if (chIdx === 0 && pIdx === 0 && (existing.currentParagraphIndex > 0 || existing.currentChapterIndex > 0)) {
            return;
          }
        }
      } catch (e) {}

      const totalChapters = chaptersRef.current.length || 1;
      const chapterWeight = 100 / totalChapters;
      const tokens = chapterTokensRef.current;
      let intraFraction = 0;
      if (tokens?.words?.length && wIdx > 0) {
        intraFraction = wIdx / tokens.words.length;
      } else if (tokens?.paragraphs?.length && pIdx > 0) {
        intraFraction = pIdx / tokens.paragraphs.length;
      }
      const rawPercent = (chIdx + intraFraction) * chapterWeight;
      const progressPercent = Math.min(
        100,
        Math.max(pIdx > 0 || chIdx > 0 || wIdx > 0 ? 1 : 0, Math.round(rawPercent))
      );

      const payload = {
        currentChapterIndex: chIdx,
        currentParagraphIndex: pIdx,
        currentWordIndex: wIdx,
        currentAudioTimestamp: charOffset,
        readingProgress: progressPercent,
        lastReadAt: Date.now(),
      };

      try {
        localStorage.setItem(`audbook_prog_${book.id}`, JSON.stringify(payload));
      } catch (e) {}

      try {
        db.books.update(book.id, payload);
      } catch (e) {}

      pushProgressToCloud({
        book_id: book.id,
        current_chapter_index: chIdx,
        current_paragraph_index: pIdx,
        current_word_index: wIdx,
        current_audio_timestamp: charOffset,
        reading_progress: progressPercent,
        last_read_at: payload.lastReadAt,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveOnExit();
      }
    };

    window.addEventListener('beforeunload', handleSaveOnExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      handleSaveOnExit();
      window.removeEventListener('beforeunload', handleSaveOnExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load a book by ID (merges IndexedDB + localStorage for 100% reliability)
  const loadBook = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const book = await db.books.get(bookId);
      if (!book) return false;

      // Check if localStorage has newer progress
      try {
        const localProgRaw = localStorage.getItem(`audbook_prog_${bookId}`);
        if (localProgRaw) {
          const localProg = JSON.parse(localProgRaw);
          if (!book.lastReadAt || localProg.lastReadAt >= book.lastReadAt) {
            book.currentChapterIndex = localProg.currentChapterIndex ?? book.currentChapterIndex;
            book.currentParagraphIndex = localProg.currentParagraphIndex ?? book.currentParagraphIndex;
            book.currentWordIndex = localProg.currentWordIndex ?? book.currentWordIndex;
            book.readingProgress = localProg.readingProgress ?? book.readingProgress;
            book.lastReadAt = localProg.lastReadAt ?? book.lastReadAt;
          }
        }
      } catch (e) {
        console.warn('Error reading progress from localStorage:', e);
      }

      // Check if localStorage has recent scroll state
      try {
        const localScrollRaw = localStorage.getItem(`audbook_scroll_${bookId}`);
        if (localScrollRaw) {
          const localScroll = JSON.parse(localScrollRaw);
          if (typeof localScroll.chapterIndex === 'number') {
            book.currentChapterIndex = localScroll.chapterIndex;
          }
          if (typeof localScroll.paragraphIndex === 'number' && localScroll.paragraphIndex > 0) {
            book.currentParagraphIndex = localScroll.paragraphIndex;
          }
        }
      } catch (e) {}

      const bookChapters = await db.chapters.where('bookId').equals(bookId).sortBy('order');
      
      // Check if Supabase has newer progress from phone/laptop
      try {
        const cloudProg = await fetchProgressFromCloud(bookId);
        if (cloudProg && (!book.lastReadAt || cloudProg.last_read_at > book.lastReadAt)) {
          book.currentChapterIndex = cloudProg.current_chapter_index ?? book.currentChapterIndex;
          book.currentParagraphIndex = cloudProg.current_paragraph_index ?? book.currentParagraphIndex;
          book.currentWordIndex = cloudProg.current_word_index ?? book.currentWordIndex;
          book.readingProgress = cloudProg.reading_progress ?? book.readingProgress;
          book.lastReadAt = cloudProg.last_read_at ?? book.lastReadAt;

          try {
            localStorage.setItem("audbook_prog_" + bookId, JSON.stringify(cloudProg));
            await db.books.update(bookId, {
              currentChapterIndex: book.currentChapterIndex,
              currentParagraphIndex: book.currentParagraphIndex,
              currentWordIndex: book.currentWordIndex,
              readingProgress: book.readingProgress,
              lastReadAt: book.lastReadAt,
            });
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Could not fetch cloud progress:", e);
      }

      if (bookChapters.length === 0) return false;

      setActiveBook(book);
      setChapters(bookChapters);

      const targetChIndex = Math.min(Math.max(0, book.currentChapterIndex || 0), bookChapters.length - 1);
      setCurrentChapterIndex(targetChIndex);
      setCurrentParagraphIndex(book.currentParagraphIndex || 0);
      setCurrentWordIndex(book.currentWordIndex || 0);

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

  // Auto-scroll to active sentence / word element
  const scrollToActiveElement = useCallback(
    (pIdx: number) => {
      if (!settings.autoScroll) return;
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

    // Determine starting character offset from current paragraph
    let startCharOffset = 0;
    if (chapterTokens && currentParagraphIndex > 0 && currentParagraphIndex < chapterTokens.paragraphStarts.length) {
      startCharOffset = chapterTokens.paragraphStarts[currentParagraphIndex] || 0;
    }

    setIsPlaying(true);
    setIsPaused(false);

    let lastProgressSaveTime = Date.now();

    speechControllerRef.current.play(rawText, startCharOffset, {
      onBoundary: ({ charIndex }) => {
        lastCharIndexRef.current = charIndex;
        const tokens = chapterTokensRef.current;
        if (!tokens) return;

        const { word, sentence } = findTokenByCharIndex(tokens, charIndex);
        if (word) {
          setActiveWord(word);
          setCurrentWordIndex(word.wordIndex);

          const hasParagraphChanged = word.paragraphIndex !== currentParagraphIndexRef.current;
          const hasTimeElapsed = Date.now() - lastProgressSaveTime > 3000;

          if (hasParagraphChanged) {
            setCurrentParagraphIndex(word.paragraphIndex);
            scrollToActiveElement(word.paragraphIndex);
          }

          if (hasParagraphChanged || hasTimeElapsed) {
            lastProgressSaveTime = Date.now();
            persistProgress(currentChapterIndexRef.current, word.paragraphIndex, word.wordIndex, charIndex);
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
        if (currentChapterIndexRef.current < chaptersRef.current.length - 1) {
          goToChapter(currentChapterIndexRef.current + 1, 0, 0);
        }
      },
      onError: (err) => {
        console.warn('Speech controller error:', err);
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  }, [currentChapter, chapterTokens, currentParagraphIndex, scrollToActiveElement, persistProgress]);

  const pauseAudio = useCallback(() => {
    speechControllerRef.current?.pause();
    setIsPlaying(false);
    setIsPaused(true);
    // Explicitly persist position immediately on pause
    persistProgress(
      currentChapterIndexRef.current,
      currentParagraphIndexRef.current,
      currentWordIndexRef.current,
      lastCharIndexRef.current
    );
  }, [persistProgress]);

  const resumeAudio = useCallback(() => {
    speechControllerRef.current?.resume();
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const stopAudio = useCallback(() => {
    speechControllerRef.current?.stop();
    setIsPlaying(false);
    setIsPaused(false);
    persistProgress(
      currentChapterIndexRef.current,
      currentParagraphIndexRef.current,
      currentWordIndexRef.current,
      lastCharIndexRef.current
    );
    setActiveWord(null);
    setActiveSentence(null);
  }, [persistProgress]);

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
      const tokens = chapterTokensRef.current;
      if (!tokens) return;
      const wordsJump = Math.round(secondsOffset * 3);
      const targetWordIdx = Math.max(0, Math.min(tokens.words.length - 1, currentWordIndexRef.current + wordsJump));
      const targetWord = tokens.words[targetWordIdx];
      if (targetWord) {
        jumpToWord(targetWord.charStart);
      }
    },
    []
  );

  const jumpToParagraph = useCallback(
    (pIdx: number) => {
      const tokens = chapterTokensRef.current;
      if (!tokens) return;
      const charOffset = tokens.paragraphStarts[pIdx] || 0;
      setCurrentParagraphIndex(pIdx);
      scrollToActiveElement(pIdx);

      if (speechControllerRef.current && (isPlaying || isPaused)) {
        speechControllerRef.current.seekTo(charOffset);
      }
      persistProgress(currentChapterIndexRef.current, pIdx, 0, charOffset);
    },
    [isPlaying, isPaused, scrollToActiveElement, persistProgress]
  );

  const jumpToWord = useCallback(
    (charStart: number) => {
      const tokens = chapterTokensRef.current;
      if (!tokens) return;
      const { word, sentence } = findTokenByCharIndex(tokens, charStart);
      if (word) {
        setActiveWord(word);
        setCurrentParagraphIndex(word.paragraphIndex);
        setCurrentWordIndex(word.wordIndex);
        scrollToActiveElement(word.paragraphIndex);
        persistProgress(currentChapterIndexRef.current, word.paragraphIndex, word.wordIndex, charStart);
      }
      if (sentence) {
        setActiveSentence(sentence);
      }
      if (speechControllerRef.current && (isPlaying || isPaused)) {
        speechControllerRef.current.seekTo(charStart);
      } else if (!isPlaying) {
        if (!currentChapter) return;
        speechControllerRef.current?.play(currentChapter.rawText, charStart, {
          onBoundary: ({ charIndex }) => {
            const res = findTokenByCharIndex(tokens, charIndex);
            if (res.word) {
              setActiveWord(res.word);
              setCurrentWordIndex(res.word.wordIndex);
              if (res.word.paragraphIndex !== currentParagraphIndexRef.current) {
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
    [currentChapter, isPlaying, isPaused, scrollToActiveElement, persistProgress]
  );

  const goToChapter = useCallback(
    (order: number, targetParagraphIndex: number = 0, targetWordIndex: number = 0) => {
      if (order < 0 || order >= chaptersRef.current.length) return;
      speechControllerRef.current?.stop();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentChapterIndex(order);
      setCurrentParagraphIndex(targetParagraphIndex);
      setCurrentWordIndex(targetWordIndex);
      setActiveWord(null);
      setActiveSentence(null);

      if (activeBookRef.current) {
        try {
          localStorage.setItem(
            `audbook_scroll_${activeBookRef.current.id}`,
            JSON.stringify({
              scrollY: 0,
              chapterIndex: order,
              paragraphIndex: targetParagraphIndex,
              timestamp: Date.now(),
            })
          );
        } catch (e) {}
      }

      persistProgress(order, targetParagraphIndex, targetWordIndex, 0);
    },
    [persistProgress]
  );

  const nextChapter = useCallback(() => {
    if (currentChapterIndexRef.current < chaptersRef.current.length - 1) {
      goToChapter(currentChapterIndexRef.current + 1, 0, 0);
    }
  }, [goToChapter]);

  const prevChapter = useCallback(() => {
    if (currentChapterIndexRef.current > 0) {
      goToChapter(currentChapterIndexRef.current - 1, 0, 0);
    }
  }, [goToChapter]);

  // Bookmarks
  const addBookmark = async (snippet?: string) => {
    const book = activeBookRef.current;
    if (!book || !currentChapter) return;
    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId: book.id,
      chapterIndex: currentChapterIndexRef.current,
      chapterTitle: currentChapter.title,
      paragraphIndex: currentParagraphIndexRef.current,
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
    const book = activeBookRef.current;
    if (!book || !currentChapter || !selectedText.trim()) return;
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookId: book.id,
      chapterIndex: currentChapterIndexRef.current,
      chapterTitle: currentChapter.title,
      paragraphIndex: currentParagraphIndexRef.current,
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
    persistProgress,
    setCurrentParagraphIndex,

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
