'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Book } from '@/lib/types';
import { BookOpen, MoreVertical, Trash2, CheckCircle2, BookmarkCheck, FileDown, Clock } from 'lucide-react';
import { db } from '@/lib/db';

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: Book['status']) => void;
  onExport: (book: Book) => void;
}

export default function BookCard({ book, onDelete, onStatusChange, onExport }: BookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never read';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-lg">
      {/* Book Cover with Click Navigation */}
      <Link
        href={`/reader/${book.id}`}
        className="relative mb-3 aspect-[2/3] w-full overflow-hidden rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
            <BookOpen className="mb-2 h-8 w-8 text-[var(--text-muted)]" />
            <span className="font-serif text-sm font-semibold line-clamp-2 text-[var(--text-secondary)]">
              {book.title}
            </span>
          </div>
        )}

        {/* Format Tag & Progress Badge */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-white backdrop-blur-xs">
            {book.format}
          </span>
        </div>

        {book.readingProgress > 0 && (
          <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-mono font-semibold text-white backdrop-blur-xs tnum">
            {book.readingProgress}%
          </div>
        )}

        {/* Hover Read Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-md">
            Open Reader
          </span>
        </div>
      </Link>

      {/* Book Details */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <Link
              href={`/reader/${book.id}`}
              className="line-clamp-1 font-serif text-base font-semibold tracking-tight text-[var(--text-ink)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {book.title}
            </Link>

            {/* Actions Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] py-1 shadow-xl">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Reading Status
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(book.id, 'reading');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Currently Reading
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(book.id, 'completed');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(book.id, 'want_to_read');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                    >
                      <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" /> Want to Read
                    </button>

                    <div className="my-1 border-t border-[var(--border-hairline)]" />

                    <button
                      type="button"
                      onClick={() => {
                        onExport(book);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                    >
                      <FileDown className="h-3.5 w-3.5" /> Export Annotations
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onDelete(book.id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Book
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="line-clamp-1 text-xs text-[var(--text-secondary)] mt-0.5">
            {book.author}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(3, book.readingProgress)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1 tnum">
              <Clock className="h-3 w-3" /> {formatTimeAgo(book.lastReadAt)}
            </span>
            <span className="tnum">{book.totalChapters} ch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
