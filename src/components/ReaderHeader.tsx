'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReader } from '@/context/ReaderContext';
import {
  ChevronLeft,
  List,
  Bookmark,
  SlidersHorizontal,
  Minimize2,
  Maximize2,
  Volume2,
  Sparkles,
} from 'lucide-react';

interface ReaderHeaderProps {
  onToggleSidebar: (tab?: 'toc' | 'bookmarks' | 'highlights' | 'search') => void;
  onOpenSettings: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export default function ReaderHeader({
  onToggleSidebar,
  onOpenSettings,
  isFocusMode,
  onToggleFocusMode,
}: ReaderHeaderProps) {
  const router = useRouter();
  const { activeBook, currentChapter, currentChapterIndex, chapters, isPlaying, togglePlayPause } = useReader();

  if (!activeBook) return null;

  return (
    <header
      className={`sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md transition-all duration-300 ${
        isFocusMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Back & TOC */}
        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </Link>

          <button
            type="button"
            onClick={() => onToggleSidebar('toc')}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 px-2.5 py-1 text-xs font-medium text-[var(--text-ink)] hover:bg-[var(--bg-elevated)] transition-colors"
            title="Table of Contents"
          >
            <List className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="max-w-[140px] truncate sm:max-w-[200px]">
              {currentChapter?.title || 'Contents'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono tnum">
              {currentChapterIndex + 1}/{chapters.length}
            </span>
          </button>
        </div>

        {/* Center: Book Title */}
        <div className="hidden md:flex flex-col items-center">
          <span className="font-serif text-xs font-bold text-[var(--text-ink)] truncate max-w-xs">
            {activeBook.title}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {activeBook.author}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Voice Toggle */}
          <button
            type="button"
            onClick={togglePlayPause}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isPlaying
                ? 'bg-blue-600 text-white'
                : 'border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-elevated)]'
            }`}
            title={isPlaying ? 'Pause Narration' : 'Start Read-Along Narration'}
          >
            <Volume2 className={`h-3.5 w-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{isPlaying ? 'Playing' : 'Listen'}</span>
          </button>

          {/* Bookmarks & Annotations */}
          <button
            type="button"
            onClick={() => onToggleSidebar('bookmarks')}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Bookmarks & Highlights"
          >
            <Bookmark className="h-4 w-4" />
          </button>

          {/* Appearance & Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Typography & Audio Settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* Mini Dock Mode */}
          <button
            type="button"
            onClick={() => {
              router.push('/library');
            }}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Switch to Mini Reader Mode (Browse Library)"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          {/* Focus Mode */}
          <button
            type="button"
            onClick={onToggleFocusMode}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Distraction-Free Focus Mode"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
