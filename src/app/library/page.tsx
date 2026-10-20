'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Book } from '@/lib/types';
import { seedSampleBooksIfEmpty } from '@/lib/sampleData';
import BookCard from '@/components/BookCard';
import UploaderModal from '@/components/UploaderModal';
import SettingsModal from '@/components/SettingsModal';
import {
  BookOpen,
  Plus,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  BookmarkCheck,
  FileText,
} from 'lucide-react';
import { useReader } from '@/context/ReaderContext';

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | Book['status']>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { loadBook, playAudio } = useReader();

  const loadAllBooks = async () => {
    setIsLoading(true);
    await seedSampleBooksIfEmpty();
    const all = await db.books.orderBy('lastReadAt').reverse().toArray();

    // Merge recent progress from localStorage
    const merged = all.map((b) => {
      try {
        const localProgRaw = localStorage.getItem(`audbook_prog_${b.id}`);
        if (localProgRaw) {
          const lp = JSON.parse(localProgRaw);
          if (!b.lastReadAt || lp.lastReadAt >= b.lastReadAt) {
            return {
              ...b,
              currentChapterIndex: lp.currentChapterIndex ?? b.currentChapterIndex,
              currentParagraphIndex: lp.currentParagraphIndex ?? b.currentParagraphIndex,
              currentWordIndex: lp.currentWordIndex ?? b.currentWordIndex,
              readingProgress: lp.readingProgress ?? b.readingProgress,
              lastReadAt: lp.lastReadAt ?? b.lastReadAt,
            };
          }
        }
      } catch (e) {}
      return b;
    });

    setBooks(merged);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllBooks();
  }, []);

  const handleDeleteBook = async (bookId: string) => {
    if (confirm('Are you sure you want to remove this book from your library?')) {
      await db.books.delete(bookId);
      await db.chapters.where('bookId').equals(bookId).delete();
      await db.bookmarks.where('bookId').equals(bookId).delete();
      await db.highlights.where('bookId').equals(bookId).delete();
      await db.audioCache.where('bookId').equals(bookId).delete();
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    }
  };

  const handleStatusChange = async (bookId: string, newStatus: Book['status']) => {
    await db.books.update(bookId, { status: newStatus });
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, status: newStatus } : b))
    );
  };

  const handleExport = async (book: Book) => {
    const bookmarks = await db.bookmarks.where('bookId').equals(book.id).toArray();
    const highlights = await db.highlights.where('bookId').equals(book.id).toArray();

    const markdown = `# ${book.title} — Reading Annotations
Author: ${book.author}
Exported: ${new Date().toLocaleDateString()}

## Highlights (${highlights.length})
${highlights.map((h, i) => `### ${i + 1}. Chapter: ${h.chapterTitle}\n> "${h.selectedText}"\n${h.note ? `*Note: ${h.note}*\n` : ''}`).join('\n')}

## Bookmarks (${bookmarks.length})
${bookmarks.map((bm, i) => `- **${bm.chapterTitle}**: "${bm.snippet}"`).join('\n')}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_annotations.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' || book.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [books, searchQuery, selectedStatus]);

  // Anchor Book for the Hero Cell (Most recently read book with progress)
  const anchorBook = useMemo(() => {
    return books.find((b) => b.readingProgress > 0 && b.readingProgress < 100) || books[0];
  }, [books]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-ink)] pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--text-ink)] text-[var(--bg-surface)] shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[var(--text-ink)]">
                Audbook
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] leading-none">
                AI-Powered Read-Along
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Voice & Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUploaderOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--text-ink)] px-3.5 py-1.5 text-xs font-semibold text-[var(--bg-surface)] shadow-xs hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              <span>Import Book</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Dominant Anchor Bento Cell: Resume Reading */}
        {anchorBook && (
          <section className="mb-10 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-sm transition-all sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* Book Thumbnail */}
                <div className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] shadow-md">
                  {anchorBook.coverUrl ? (
                    <img
                      src={anchorBook.coverUrl}
                      alt={anchorBook.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-2xl text-[var(--text-muted)]">
                      {anchorBook.title.slice(0, 1)}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono uppercase text-white">
                    {anchorBook.format}
                  </span>
                </div>

                {/* Details */}
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Jump Back In
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tnum">
                      Chapter {anchorBook.currentChapterIndex + 1} of {anchorBook.totalChapters}
                    </span>
                  </div>

                  <h2 className="mt-1.5 font-serif text-2xl font-bold tracking-tight text-[var(--text-ink)] sm:text-3xl">
                    {anchorBook.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                    by {anchorBook.author}
                  </p>

                  {/* Progress Line */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
                      <span className="font-medium text-[var(--text-secondary)]">
                        Overall Progress
                      </span>
                      <span className="font-mono font-semibold text-[var(--text-ink)] tnum">
                        {anchorBook.readingProgress}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${Math.max(4, anchorBook.readingProgress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/reader/${anchorBook.id}`}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Resume Reading</span>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await loadBook(anchorBook.id);
                    playAudio();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Start AI Voice</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Toolbar: Search, Filters, View Modes */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search library by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] py-2 pl-9 pr-4 text-xs text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filters & View Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1">
              {(['all', 'reading', 'completed', 'want_to_read'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                    selectedStatus === st
                      ? 'bg-[var(--text-ink)] text-[var(--bg-surface)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-ink)]'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'reading'
                    ? 'Reading'
                    : st === 'completed'
                    ? 'Completed'
                    : 'Want to Read'}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded p-1 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-ink)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded p-1 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-ink)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Books Grid / List */}
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)] py-16 px-4 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
            <h3 className="text-base font-semibold text-[var(--text-ink)]">
              No books found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              {searchQuery
                ? `No books match "${searchQuery}". Try a different keyword.`
                : 'Your library is empty. Import your first EPUB, PDF, or TXT file to get started.'}
            </p>
            <button
              type="button"
              onClick={() => setIsUploaderOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--text-ink)] px-4 py-2 text-xs font-semibold text-[var(--bg-surface)] shadow-xs hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>Import Book Now</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={handleDeleteBook}
                onStatusChange={handleStatusChange}
                onExport={handleExport}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--bg-elevated)]/50 transition-colors"
              >
                <Link
                  href={`/reader/${book.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-serif text-xs">
                        {book.title.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-[var(--text-ink)] hover:text-blue-600 transition-colors">
                      {book.title}
                    </h4>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {book.author} · {book.totalChapters} chapters
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-mono font-medium text-[var(--text-ink)] tnum">
                      {book.readingProgress}%
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">
                      {book.status.replace('_', ' ')}
                    </div>
                  </div>

                  <Link
                    href={`/reader/${book.id}`}
                    className="rounded-lg bg-[var(--text-ink)] px-3 py-1.5 text-xs font-medium text-[var(--bg-surface)] hover:opacity-90 transition-opacity"
                  >
                    Read
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Uploader Modal */}
      <UploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onBookAdded={async (newId) => {
          await loadAllBooks();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
