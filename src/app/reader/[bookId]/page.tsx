'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useReader } from '@/context/ReaderContext';
import ReaderHeader from '@/components/ReaderHeader';
import ReaderContent from '@/components/ReaderContent';
import AudioPlayerBar from '@/components/AudioPlayerBar';
import BookmarksSidebar from '@/components/BookmarksSidebar';
import SettingsModal from '@/components/SettingsModal';
import { Loader2, Minimize2, X, RotateCcw } from 'lucide-react';

interface ReaderPageProps {
  params: Promise<{ bookId: string }>;
}

function ReaderViewInner({ params }: { params: Promise<{ bookId: string }> }) {
  const resolvedParams = use(params);
  const bookId = resolvedParams.bookId;
  const router = useRouter();

  const {
    activeBook,
    loadBook,
    togglePlayPause,
    seekRelative,
    jumpToParagraph,
    goToChapter,
  } = useReader();

  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'highlights' | 'search'>('toc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Load the requested book
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      const success = await loadBook(bookId);
      if (!success && isMounted) {
        router.push('/library');
      } else if (isMounted) {
        setIsLoading(false);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [bookId, loadBook, router]);

  // Check if we should prompt the user to resume progress
  useEffect(() => {
    if (activeBook && (activeBook.currentChapterIndex > 0 || activeBook.currentParagraphIndex > 0)) {
      setShowResumeBanner(true);
    }
  }, [activeBook?.id]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        seekRelative(10);
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        seekRelative(-10);
      } else if (e.code === 'Escape') {
        if (isFocusMode) setIsFocusMode(false);
        if (sidebarOpen) setSidebarOpen(false);
        if (settingsOpen) setSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, seekRelative, isFocusMode, sidebarOpen, settingsOpen]);

  if (isLoading || !activeBook) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-ink)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Opening book from local storage...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-canvas)] text-[var(--text-ink)] selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      {/* Resume Progress Toast Banner */}
      {showResumeBanner && (
        <aside
          aria-label="Resume Reading Notification"
          className="fixed top-14 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 shadow-xl backdrop-blur-md"
        >
          <RotateCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-[var(--text-ink)] font-medium">
            Resume Chapter {activeBook.currentChapterIndex + 1} at paragraph {activeBook.currentParagraphIndex + 1}?
          </span>
          <button
            type="button"
            onClick={() => {
              goToChapter(activeBook.currentChapterIndex);
              setTimeout(() => {
                jumpToParagraph(activeBook.currentParagraphIndex);
              }, 100);
              setShowResumeBanner(false);
            }}
            className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => setShowResumeBanner(false)}
            className="rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-ink)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </aside>
      )}

      {/* Focus Mode Floating Exit Pill */}
      {isFocusMode && (
        <button
          type="button"
          onClick={() => setIsFocusMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)]/80 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-md backdrop-blur-md hover:bg-[var(--bg-surface)] hover:text-[var(--text-ink)] transition-all"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          <span>Exit Focus Mode</span>
        </button>
      )}

      {/* Header */}
      <ReaderHeader
        onToggleSidebar={(tab) => {
          if (tab) setSidebarTab(tab);
          setSidebarOpen(!sidebarOpen);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
      />

      {/* Main Chapter Content */}
      <main className="min-h-screen">
        <ReaderContent />
      </main>

      {/* Audio Controls Bar */}
      {!isFocusMode && (
        <AudioPlayerBar onOpenSettings={() => setSettingsOpen(true)} />
      )}

      {/* Sidebar Drawer */}
      <BookmarksSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        defaultTab={sidebarTab}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default function ReaderPage({ params }: ReaderPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-ink)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Opening book...
          </p>
        </div>
      }
    >
      <ReaderViewInner params={params} />
    </Suspense>
  );
}
