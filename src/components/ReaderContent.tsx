'use client';

import React, { useMemo } from 'react';
import { useReader } from '@/context/ReaderContext';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import TextSelectionPopover from './TextSelectionPopover';

export default function ReaderContent() {
  const {
    currentChapter,
    currentChapterIndex,
    chapters,
    activeBook,
    settings,
    activeWord,
    activeSentence,
    chapterTokens,
    jumpToWord,
    jumpToParagraph,
    nextChapter,
    highlights,
  } = useReader();

  if (!currentChapter || !activeBook) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
        <BookOpen className="mb-2 h-8 w-8 animate-pulse" />
        <p className="text-sm font-medium">Loading chapter content...</p>
      </div>
    );
  }

  // Formatting settings classes
  const fontClass =
    settings.fontFamily === 'literata'
      ? 'font-literata'
      : settings.fontFamily === 'merriweather'
      ? 'font-merriweather'
      : settings.fontFamily === 'opendyslexic'
      ? 'font-opendyslexic'
      : 'font-inter';

  const widthClass =
    settings.columnWidth === 'narrow'
      ? 'max-w-[55ch]'
      : settings.columnWidth === 'wide'
      ? 'max-w-[80ch]'
      : 'max-w-[65ch]';

  const alignClass = settings.textAlign === 'justify' ? 'text-justify' : 'text-left';

  // Highlights in current chapter
  const currentChapterHighlights = useMemo(() => {
    return highlights.filter((h) => h.chapterIndex === currentChapterIndex);
  }, [highlights, currentChapterIndex]);

  return (
    <article
      className={`mx-auto w-full px-4 pt-8 pb-32 sm:px-6 ${widthClass} ${fontClass} transition-all duration-200 select-text`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <TextSelectionPopover />

      {/* Chapter Editorial Header */}
      <header className="mb-10 border-b border-[var(--border-hairline)] pb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          <span>
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </span>
        </div>

        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[var(--text-ink)] sm:text-4xl md:text-5xl leading-tight">
          {currentChapter.title}
        </h1>

        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-sans text-[var(--text-muted)]">
          <span className="flex items-center gap-1 tnum">
            <BookOpen className="h-3 w-3" /> {currentChapter.wordCount} words
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 tnum">
            <Clock className="h-3 w-3" /> ~
            {Math.max(1, Math.round(currentChapter.wordCount / 200))} min read
          </span>
        </div>
      </header>

      {/* Chapter Paragraphs Container */}
      <div className={`space-y-6 ${alignClass} text-[var(--text-ink)]`}>
        {chapterTokens && chapterTokens.paragraphs.length > 0 ? (
          chapterTokens.paragraphs.map((para) => {
            const pIdx = para.paragraphIndex;
            const pHighlights = currentChapterHighlights.filter(
              (h) => h.paragraphIndex === pIdx
            );

            // Compute precise character ranges for user highlights in this paragraph
            const highlightRanges = pHighlights
              .map((h) => {
                const localIdx = para.text.indexOf(h.selectedText);
                if (localIdx === -1) return null;
                return {
                  globalStart: para.charStart + localIdx,
                  globalEnd: para.charStart + localIdx + h.selectedText.length,
                  color: h.color,
                };
              })
              .filter(Boolean) as Array<{
              globalStart: number;
              globalEnd: number;
              color: string;
            }>;

            return (
              <p
                key={pIdx}
                data-p-idx={pIdx}
                onClick={() => jumpToParagraph(pIdx)}
                className="relative my-3 leading-relaxed transition-colors duration-150 cursor-pointer"
              >
                {para.sentences.map((sent) => {
                  const isSentenceActive =
                    activeSentence !== null &&
                    activeSentence.sentenceIndex === sent.sentenceIndex &&
                    (settings.highlightMode === 'both' ||
                      settings.highlightMode === 'sentence');

                  return (
                    <span
                      key={sent.sentenceIndex}
                      className={`transition-colors duration-150 rounded ${
                        isSentenceActive ? 'karaoke-sentence-active' : ''
                      }`}
                    >
                      {sent.words.map((w) => {
                        // Crucial fix: ONLY match by unique wordIndex!
                        // This prevents any other identical words in the paragraph or chapter from being highlighted.
                        const isThisWordActive =
                          activeWord !== null &&
                          activeWord.wordIndex === w.wordIndex &&
                          (settings.highlightMode === 'both' ||
                            settings.highlightMode === 'word');

                        // Match user highlight strictly by character offset range
                        const matchedUserHighlight = highlightRanges.find(
                          (hr) =>
                            w.charStart >= hr.globalStart &&
                            w.charEnd <= hr.globalEnd
                        );

                        let wordClass =
                          'cursor-pointer transition-all duration-100 hover:opacity-80';

                        if (isThisWordActive) {
                          wordClass += ' karaoke-word-active';
                        } else if (matchedUserHighlight) {
                          wordClass += ` highlight-${matchedUserHighlight.color}`;
                        }

                        return (
                          <React.Fragment key={w.wordIndex}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToWord(w.charStart);
                              }}
                              className={wordClass}
                            >
                              {w.rawWord}
                            </span>
                            {w.trailingSpace}
                          </React.Fragment>
                        );
                      })}
                      {sent.trailingSpace}
                    </span>
                  );
                })}
              </p>
            );
          })
        ) : (
          // Fallback while tokens are initializing
          currentChapter.rawText
            .split(/\n\s*\n/)
            .filter((p) => p.trim().length > 0)
            .map((pText, pIdx) => (
              <p key={pIdx} data-p-idx={pIdx} className="my-3 leading-relaxed">
                {pText}
              </p>
            ))
        )}
      </div>

      {/* Chapter End Navigation Card */}
      <footer className="mt-16 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 text-center shadow-xs">
        <h3 className="font-serif text-lg font-bold text-[var(--text-ink)]">
          End of {currentChapter.title}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          You've completed this chapter.
        </p>

        <div className="mt-5 flex justify-center gap-3">
          {currentChapterIndex < chapters.length - 1 ? (
            <button
              type="button"
              onClick={nextChapter}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <span>Continue to Next Chapter</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              🎉 Congratulations! You have finished this book.
            </div>
          )}
        </div>
      </footer>
    </article>
  );
}
