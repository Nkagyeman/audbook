'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReader } from '@/context/ReaderContext';
import { Play, Pause, RotateCcw, RotateCw, Maximize2, X, Volume2 } from 'lucide-react';

export default function MiniReaderDock() {
  const pathname = usePathname();
  const {
    activeBook,
    currentChapter,
    isPlaying,
    isPaused,
    togglePlayPause,
    seekRelative,
    activeWord,
    activeSentence,
    settings,
    updateSettings,
    stopAudio,
  } = useReader();

  // Don't show mini dock if we are currently on the full reader page for this active book
  const isCurrentlyInFullReader = pathname?.startsWith('/reader/');

  if (!activeBook || isCurrentlyInFullReader) {
    return null;
  }

  // Only show if user has audio active, paused, or loaded
  if (!isPlaying && !isPaused && !activeWord && !activeSentence) {
    return null;
  }

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(settings.playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    updateSettings({ playbackSpeed: nextSpeed });
  };

  return (
    <aside
      aria-label="Audio Reader Dock"
      className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xl transition-all duration-300"
      style={{
        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.3), 0 0 1px 1px var(--border-hairline)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Book Cover Thumbnail */}
        <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-sm">
          {activeBook.coverUrl ? (
            <img
              src={activeBook.coverUrl}
              alt={activeBook.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-serif text-[var(--text-muted)]">
              {activeBook.title.slice(0, 1)}
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="flex gap-0.5">
                <span className="h-3 w-1 animate-pulse rounded-full bg-blue-400" />
                <span className="h-4 w-1 animate-pulse rounded-full bg-blue-300 delay-75" />
                <span className="h-2 w-1 animate-pulse rounded-full bg-blue-500 delay-150" />
              </span>
            </div>
          )}
        </div>

        {/* Info & Live Sentence */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="truncate text-xs font-semibold tracking-tight text-[var(--text-ink)]">
              {activeBook.title}
            </h4>
            <div className="flex items-center gap-1">
              <Link
                href={`/reader/${activeBook.id}`}
                title="Expand to Full Reader"
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={stopAudio}
                title="Dismiss Mini Player"
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="truncate text-[11px] text-[var(--text-muted)]">
            {currentChapter?.title || 'Chapter in progress'}
          </p>

          {/* Active sentence live preview */}
          <div className="mt-1.5 line-clamp-2 rounded bg-[var(--bg-elevated)] p-1.5 text-[11px] leading-snug text-[var(--text-secondary)] border border-[var(--border-hairline)]">
            {activeSentence?.text ? (
              <span>
                <Volume2 className="inline mr-1 h-3 w-3 text-blue-500 align-middle" />
                {activeSentence.text}
              </span>
            ) : (
              <span className="italic text-[var(--text-muted)]">
                Ready to resume narration...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--border-hairline)] pt-2.5">
        <button
          type="button"
          onClick={cycleSpeed}
          className="rounded px-2 py-0.5 text-[11px] font-mono font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          title="Change Playback Speed"
        >
          {settings.playbackSpeed}x
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => seekRelative(-5)}
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Rewind 5s"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text-ink)] text-[var(--bg-surface)] hover:opacity-90 transition-opacity"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seekRelative(5)}
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            title="Forward 5s"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <Link
          href={`/reader/${activeBook.id}`}
          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Open Reader &rarr;
        </Link>
      </div>
    </aside>
  );
}
