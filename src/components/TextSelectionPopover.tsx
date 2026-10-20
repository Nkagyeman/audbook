'use client';

import React, { useState, useEffect } from 'react';
import { useReader } from '@/context/ReaderContext';
import { Bookmark, Volume2, MessageSquare, Check, X } from 'lucide-react';
import { HighlightColor } from '@/lib/types';

export default function TextSelectionPopover() {
  const { addHighlight, addBookmark, jumpToWord, chapterTokens } = useReader();
  const [selectedText, setSelectedText] = useState('');
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        if (!isAddingNote) {
          setCoords(null);
          setSelectedText('');
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        setSelectedText(text);
        setCoords({
          x: Math.max(10, Math.min(window.innerWidth - 260, rect.left + rect.width / 2 - 120)),
          y: Math.max(10, rect.top - 50 + window.scrollY),
        });
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
    };
  }, [isAddingNote]);

  if (!coords || !selectedText) return null;

  const handleApplyHighlight = (color: HighlightColor) => {
    addHighlight(selectedText, color, noteText.trim() || undefined);
    window.getSelection()?.removeAllRanges();
    setCoords(null);
    setSelectedText('');
    setIsAddingNote(false);
    setNoteText('');
  };

  const handleSpeakFromHere = () => {
    if (!chapterTokens) return;
    const match = chapterTokens.words.find((w) => selectedText.includes(w.word));
    if (match) {
      jumpToWord(match.charStart);
    }
    window.getSelection()?.removeAllRanges();
    setCoords(null);
  };

  const handleBookmarkSelection = () => {
    addBookmark(selectedText);
    window.getSelection()?.removeAllRanges();
    setCoords(null);
  };

  return (
    <div
      className="absolute z-50 flex flex-col rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1.5 shadow-2xl transition-all"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 1px 1px var(--border-hairline)',
      }}
    >
      <div className="flex items-center gap-1">
        {/* Colors */}
        {(['yellow', 'green', 'blue', 'purple'] as HighlightColor[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => handleApplyHighlight(c)}
            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
              c === 'yellow'
                ? 'bg-amber-300'
                : c === 'green'
                ? 'bg-emerald-300'
                : c === 'blue'
                ? 'bg-sky-300'
                : 'bg-purple-300'
            }`}
            title={`Highlight ${c}`}
          />
        ))}

        <div className="mx-1 h-4 w-px bg-[var(--border-hairline)]" />

        {/* Speak from here */}
        <button
          type="button"
          onClick={handleSpeakFromHere}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-blue-600 transition-colors"
          title="Play narration from this phrase"
        >
          <Volume2 className="h-4 w-4" />
        </button>

        {/* Bookmark */}
        <button
          type="button"
          onClick={handleBookmarkSelection}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
          title="Save as Bookmark"
        >
          <Bookmark className="h-4 w-4" />
        </button>

        {/* Note */}
        <button
          type="button"
          onClick={() => setIsAddingNote(!isAddingNote)}
          className={`rounded p-1.5 transition-colors ${
            isAddingNote
              ? 'bg-[var(--bg-elevated)] text-blue-600'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)]'
          }`}
          title="Add Annotation Note"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Note input drop-down */}
      {isAddingNote && (
        <div className="mt-2 border-t border-[var(--border-hairline)] pt-2">
          <textarea
            placeholder="Type your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-48 rounded border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-xs text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:outline-none"
            rows={2}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => handleApplyHighlight(selectedColor)}
              className="flex items-center gap-1 rounded bg-[var(--text-ink)] px-2 py-0.5 text-[10px] font-semibold text-[var(--bg-surface)]"
            >
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
