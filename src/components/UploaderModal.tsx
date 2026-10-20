'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, BookOpen, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseEpubFile } from '@/lib/parsers/epub';
import { parsePdfFile } from '@/lib/parsers/pdf';
import { parseTxtFile } from '@/lib/parsers/txt';
import { db } from '@/lib/db';
import { Book, Chapter, ParsedBookResult } from '@/lib/types';

interface UploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (newBookId: string) => void;
}

export default function UploaderModal({ isOpen, onClose, onBookAdded }: UploaderModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setProgressStatus('Reading file bytes...');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsedResult: ParsedBookResult;

      if (ext === 'epub') {
        setProgressStatus('Extracting EPUB package document and chapters...');
        parsedResult = await parseEpubFile(file);
      } else if (ext === 'pdf') {
        setProgressStatus('Parsing PDF outline, text layers, and cover art...');
        parsedResult = await parsePdfFile(file);
      } else if (ext === 'txt' || ext === 'md') {
        setProgressStatus('Formatting structural paragraphs and headings...');
        parsedResult = await parseTxtFile(file);
      } else {
        throw new Error('Unsupported format. Please upload an EPUB, PDF, TXT, or MD file.');
      }

      setProgressStatus('Saving chapters into offline IndexedDB...');

      const bookId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newBook: Book = {
        id: bookId,
        title: parsedResult.title || file.name.replace(/\.[^/.]+$/, ''),
        author: parsedResult.author || 'Unknown Author',
        coverUrl: parsedResult.coverUrl,
        format: parsedResult.format,
        fileSize: file.size,
        totalWords: parsedResult.totalWords,
        totalChapters: parsedResult.chapters.length,
        status: 'reading',
        readingProgress: 0,
        currentChapterIndex: 0,
        currentParagraphIndex: 0,
        currentWordIndex: 0,
        currentAudioTimestamp: 0,
        lastReadAt: Date.now(),
        createdAt: Date.now(),
      };

      await db.books.add(newBook);

      const dbChapters: Chapter[] = parsedResult.chapters.map((ch, idx) => ({
        id: `${bookId}-ch-${idx}`,
        bookId,
        order: ch.order,
        title: ch.title,
        content: ch.content,
        rawText: ch.rawText,
        wordCount: ch.wordCount,
      }));

      for (const ch of dbChapters) {
        await db.chapters.add(ch);
      }

      setProgressStatus('Book added successfully!');
      setTimeout(() => {
        setIsProcessing(false);
        onBookAdded(bookId);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err?.message || 'Failed to parse file. Please try another file.');
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-2xl transition-all"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 1px 1px var(--border-hairline)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-ink)]">
              Import Book to Library
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Client-side ingestion for EPUB, PDF, TXT, and Markdown files
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-ink)] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drag and Drop Box */}
        <div className="mt-5">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50/10'
                : 'border-[var(--border-hairline)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.pdf,.txt,.md"
              onChange={onFileInputChange}
              disabled={isProcessing}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium text-[var(--text-ink)]">{progressStatus}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Processing in browser memory...</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-sm text-blue-600 group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-ink)]">
                  Click to browse or drag and drop book file
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Supports EPUB, PDF, TXT, MD (Max recommended: 50MB)
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                    <BookOpen className="h-3 w-3 text-blue-500" /> EPUB
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                    <FileText className="h-3 w-3 text-red-500" /> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                    <FileText className="h-3 w-3 text-emerald-500" /> TXT / MD
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 border border-red-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3 text-[11px] text-[var(--text-muted)]">
          <span>100% Client-Side Ingestion</span>
          <span>Zero Server Upload Limits</span>
        </div>
      </div>
    </div>
  );
}
