'use client';

import React from 'react';
import { useReader } from '@/context/ReaderContext';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  Sliders,
} from 'lucide-react';

interface AudioPlayerBarProps {
  onOpenSettings: () => void;
}

export default function AudioPlayerBar({ onOpenSettings }: AudioPlayerBarProps) {
  const {
    currentChapter,
    currentChapterIndex,
    chapters,
    currentWordIndex,
    chapterTokens,
    isPlaying,
    isPaused,
    togglePlayPause,
    seekRelative,
    prevChapter,
    nextChapter,
    settings,
    updateSettings,
    activeSentence,
    jumpToWord,
  } = useReader();

  if (!currentChapter) return null;

  const totalWords = chapterTokens?.words?.length || 1;
  const progressRatio = Math.min(1, Math.max(0, currentWordIndex / totalWords));
  const progressPercent = Math.round(progressRatio * 100);

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(settings.playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    updateSettings({ playbackSpeed: nextSpeed });
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chapterTokens || !chapterTokens.words.length) return;
    const targetIdx = Math.floor((Number(e.target.value) / 100) * (chapterTokens.words.length - 1));
    const targetWord = chapterTokens.words[targetIdx];
    if (targetWord) {
      jumpToWord(targetWord.charStart);
    }
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-4 py-2.5 sm:px-6 transition-all duration-300"
      style={{
        boxShadow: '0 -4px 20px -2px rgba(0, 0, 0, 0.08), 0 0 1px 1px var(--border-hairline)',
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {/* Scrubber Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[var(--text-muted)] tnum">
            {currentWordIndex}w
          </span>
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercent}
              onChange={handleScrubberChange}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--bg-elevated)] accent-blue-600 transition-all focus:outline-none"
              title="Scrub Chapter Audio"
            />
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] tnum">
            {chapterTokens?.words?.length || 0}w ({progressPercent}%)
          </span>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between">
          {/* Left: Active Sentence Snippet */}
          <div className="hidden sm:flex items-center gap-2 max-w-xs min-w-0">
            <Volume2 className={`h-4 w-4 flex-shrink-0 ${isPlaying ? 'text-blue-500 animate-pulse' : 'text-[var(--text-muted)]'}`} />
            <p className="truncate text-xs text-[var(--text-secondary)] italic">
              {activeSentence?.text || currentChapter.title}
            </p>
          </div>

          {/* Center: Controls Buttons */}
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            {/* Prev Chapter */}
            <button
              type="button"
              onClick={prevChapter}
              disabled={currentChapterIndex === 0}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors disabled:opacity-30"
              title="Previous Chapter"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => seekRelative(-10)}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--text-ink)] text-[var(--bg-surface)] shadow-md hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pause Narration' : 'Play Narration'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              title="Forward 10 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Next Chapter */}
            <button
              type="button"
              onClick={nextChapter}
              disabled={currentChapterIndex >= chapters.length - 1}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors disabled:opacity-30"
              title="Next Chapter"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Speed & Voice Setting */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 px-2.5 py-1 text-xs font-mono font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors tnum"
              title="Change Speed"
            >
              {settings.playbackSpeed}x
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg border border-[var(--border-hairline)] p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              title="Voice Settings"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
