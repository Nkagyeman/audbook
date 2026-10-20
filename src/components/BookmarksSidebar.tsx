'use client';

import React, { useState, useMemo } from 'react';
import { useReader } from '@/context/ReaderContext';
import {
  X,
  List,
  Bookmark as BookmarkIcon,
  Highlighter,
  Search,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface BookmarksSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'toc' | 'bookmarks' | 'highlights' | 'search';
}

export default function BookmarksSidebar({
  isOpen,
  onClose,
  defaultTab = 'toc',
}: BookmarksSidebarProps) {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks' | 'highlights' | 'search'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    activeBook,
    chapters,
    currentChapterIndex,
    goToChapter,
    jumpToParagraph,
    bookmarks,
    addBookmark,
    removeBookmark,
    highlights,
    removeHighlight,
    currentParagraphIndex,
  } = useReader();

  // Search results across chapters
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !chapters.length) return [];
    const query = searchQuery.toLowerCase();
    const results: Array<{
      chapterIndex: number;
      chapterTitle: string;
      paragraphIndex: number;
      snippet: string;
    }> = [];

    chapters.forEach((ch, chIdx) => {
      const paragraphs = ch.rawText.split(/\n\s*\n/);
      paragraphs.forEach((p, pIdx) => {
        const lower = p.toLowerCase();
        const matchIdx = lower.indexOf(query);
        if (matchIdx !== -1) {
          const start = Math.max(0, matchIdx - 40);
          const end = Math.min(p.length, matchIdx + query.length + 60);
          const snippet = (start > 0 ? '...' : '') + p.slice(start, end) + (end < p.length ? '...' : '');
          results.push({
            chapterIndex: chIdx,
            chapterTitle: ch.title,
            paragraphIndex: pIdx,
            snippet,
          });
        }
      });
    });

    return results.slice(0, 30);
  }, [chapters, searchQuery]);

  if (!isOpen || !activeBook) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl transition-transform duration-300"
        style={{
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-3.5">
          <h3 className="font-serif text-sm font-bold tracking-tight text-[var(--text-ink)] truncate max-w-[240px]">
            {activeBook.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]/40 px-3">
          <button
            type="button"
            onClick={() => setActiveTab('toc')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'toc'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Contents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'bookmarks'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <BookmarkIcon className="h-3.5 w-3.5" />
            Marks ({bookmarks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'highlights'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" />
            Notes ({highlights.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Table of Contents */}
          {activeTab === 'toc' && (
            <div className="space-y-1.5">
              {chapters.map((ch, idx) => {
                const isActive = idx === currentChapterIndex;
                const readingMinutes = Math.max(1, Math.round(ch.wordCount / 200));

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      goToChapter(idx);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                      isActive
                        ? 'border border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs'
                        : 'border border-transparent hover:border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] tnum">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <h4
                          className={`truncate text-xs font-semibold ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-[var(--text-ink)]'
                          }`}
                        >
                          {ch.title}
                        </h4>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)] line-clamp-1">
                        {ch.rawText.slice(0, 75)}...
                      </p>
                    </div>

                    <div className="flex flex-col items-end text-right flex-shrink-0">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] tnum">
                        {ch.wordCount}w
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] tnum">
                        <Clock className="h-2.5 w-2.5" /> {readingMinutes}m
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bookmarks */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => addBookmark()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-xs font-semibold text-[var(--text-ink)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Bookmark Current Paragraph ({currentParagraphIndex + 1})
              </button>

              {bookmarks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No bookmarks saved yet. Click the button above to bookmark your place.
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="group relative rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/40 p-3 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => {
                          goToChapter(bm.chapterIndex);
                          setTimeout(() => jumpToParagraph(bm.paragraphIndex), 100);
                          onClose();
                        }}
                        className="cursor-pointer flex-1"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {bm.chapterTitle}
                        </span>
                        <p className="mt-1 font-serif text-xs italic text-[var(--text-secondary)] line-clamp-2">
                          "{bm.snippet}"
                        </p>
                        <span className="mt-2 block text-[10px] text-[var(--text-muted)]">
                          {new Date(bm.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 transition-opacity"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Highlights & Notes */}
          {activeTab === 'highlights' && (
            <div className="space-y-3">
              {highlights.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  Select text in the reader to highlight phrases and attach reading notes.
                </div>
              ) : (
                highlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="group rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/40 p-3 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => {
                          goToChapter(hl.chapterIndex);
                          setTimeout(() => jumpToParagraph(hl.paragraphIndex), 100);
                          onClose();
                        }}
                        className="cursor-pointer flex-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              hl.color === 'yellow'
                                ? 'bg-amber-400'
                                : hl.color === 'green'
                                ? 'bg-emerald-400'
                                : hl.color === 'blue'
                                ? 'bg-blue-400'
                                : 'bg-purple-400'
                            }`}
                          />
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">
                            {hl.chapterTitle}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-serif italic text-[var(--text-ink)] line-clamp-3">
                          "{hl.selectedText}"
                        </p>

                        {hl.note && (
                          <div className="mt-2 rounded bg-[var(--bg-surface)] p-2 text-[11px] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                            <span className="font-semibold text-[var(--text-ink)]">Note: </span>
                            {hl.note}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeHighlight(hl.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 transition-opacity"
                        title="Delete Note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Search inside Book */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Find words in this book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] py-2 pl-9 pr-4 text-xs text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
                />
              </div>

              {searchQuery.trim() && (
                <div className="text-[11px] text-[var(--text-muted)]">
                  {searchResults.length} matching excerpts found
                </div>
              )}

              <div className="space-y-2">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      goToChapter(res.chapterIndex);
                      setTimeout(() => jumpToParagraph(res.paragraphIndex), 100);
                      onClose();
                    }}
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/30 p-2.5 text-left hover:border-blue-500 hover:bg-[var(--bg-elevated)] transition-all"
                  >
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {res.chapterTitle}
                    </span>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {res.snippet}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
