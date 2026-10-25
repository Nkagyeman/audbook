'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useReader } from '@/context/ReaderContext';
import { ArrowRight, BookOpen, Clock, ArrowUp, Check, X, ZoomIn } from 'lucide-react';
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
    currentParagraphIndex,
    setCurrentParagraphIndex,
    persistProgress,
    isPlaying,
  } = useReader();

  const [resumedToast, setResumedToast] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    caption?: string;
  } | null>(null);
  const hasRestoredScrollRef = useRef(false);

  // Reset scroll restoration flag when book or chapter changes
  useEffect(() => {
    hasRestoredScrollRef.current = false;
  }, [activeBook?.id, currentChapterIndex]);

  // Auto-scroll to saved position when opening book or chapter loads
  useEffect(() => {
    if (!activeBook || !chapterTokens || chapterTokens.paragraphs.length === 0) return;
    if (hasRestoredScrollRef.current) return;

    let targetPIdx = currentParagraphIndex;
    let targetScrollY: number | null = null;

    try {
      const savedScrollRaw = localStorage.getItem(`audbook_scroll_${activeBook.id}`);
      if (savedScrollRaw) {
        const savedScroll = JSON.parse(savedScrollRaw);
        if (savedScroll.chapterIndex === currentChapterIndex) {
          if (typeof savedScroll.scrollY === 'number' && savedScroll.scrollY > 0) {
            targetScrollY = savedScroll.scrollY;
          }
          if (typeof savedScroll.paragraphIndex === 'number' && savedScroll.paragraphIndex > 0) {
            targetPIdx = savedScroll.paragraphIndex;
          }
        }
      }
    } catch (e) {}

    if (targetPIdx <= 0 && (!targetScrollY || targetScrollY <= 20)) {
      hasRestoredScrollRef.current = true;
      return;
    }

    hasRestoredScrollRef.current = true;

    // Retry restoration smoothly up to 5 times to accommodate layout reflows and fonts
    let attempts = 0;
    const restoreTimer = setInterval(() => {
      attempts++;
      const el = document.querySelector(`[data-p-idx="${targetPIdx}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setResumedToast(targetPIdx + 1);
        setTimeout(() => setResumedToast(null), 4000);
        clearInterval(restoreTimer);
      } else if (targetScrollY !== null && targetScrollY > 0) {
        window.scrollTo({ top: targetScrollY, behavior: 'instant' });
        clearInterval(restoreTimer);
      }

      if (attempts >= 5) {
        clearInterval(restoreTimer);
      }
    }, 120);

    return () => clearInterval(restoreTimer);
  }, [activeBook?.id, chapterTokens, currentChapterIndex, currentParagraphIndex]);

  // High-precision scroll tracking for silent reading (instant persistence to localStorage & Dexie)
  useEffect(() => {
    if (isPlaying) return;
    if (!activeBook) return;

    let ticking = false;
    let debounceTimer: NodeJS.Timeout;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
          const targetY = window.innerHeight * 0.35;
          const paragraphs = document.querySelectorAll<HTMLElement>('[data-p-idx]');
          if (!paragraphs.length) return;

          let bestPIdx = currentParagraphIndex;
          for (let i = 0; i < paragraphs.length; i++) {
            const rect = paragraphs[i].getBoundingClientRect();
            if (rect.top <= targetY && rect.bottom >= targetY) {
              const idxAttr = paragraphs[i].getAttribute('data-p-idx');
              if (idxAttr !== null) {
                bestPIdx = parseInt(idxAttr, 10);
                break;
              }
            } else if (rect.top > targetY) {
              if (i > 0) {
                const prevAttr = paragraphs[i - 1].getAttribute('data-p-idx');
                if (prevAttr !== null) bestPIdx = parseInt(prevAttr, 10);
              }
              break;
            }
          }

          if (bestPIdx !== currentParagraphIndex) {
            setCurrentParagraphIndex(bestPIdx);
          }

          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const scrollData = {
              scrollY: window.scrollY,
              chapterIndex: currentChapterIndex,
              paragraphIndex: bestPIdx,
              timestamp: Date.now(),
            };
            try {
              localStorage.setItem(`audbook_scroll_${activeBook.id}`, JSON.stringify(scrollData));
            } catch (e) {}

            persistProgress(currentChapterIndex, bestPIdx, 0, 0);
          }, 250);
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(debounceTimer);
    };
  }, [isPlaying, activeBook?.id, currentChapterIndex, currentParagraphIndex, persistProgress, setCurrentParagraphIndex]);

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

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage]);

  // Parse currentChapter.content into visual blocks (text, figure, table, divider, code)
  const contentBlocks = useMemo(() => {
    if (!currentChapter?.content) return [];
    if (typeof window === 'undefined') return [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${currentChapter.content}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (!container) return [];

      const elements = Array.from(container.children);
      if (elements.length === 0) return [];

      return elements.map((el, idx) => {
        const tagName = el.tagName.toLowerCase();
        const pIdxAttr = el.getAttribute('data-p-idx');
        const pIdx = pIdxAttr !== null ? parseInt(pIdxAttr, 10) : undefined;

        // 1. Figure / Image block
        if (tagName === 'figure' || el.classList.contains('audbook-figure') || tagName === 'img') {
          const img = tagName === 'img' ? el : el.querySelector('img');
          const caption = el.querySelector('figcaption')?.textContent || '';
          return {
            id: `figure-${idx}`,
            type: 'figure' as const,
            src: img?.getAttribute('src') || '',
            alt: img?.getAttribute('alt') || '',
            caption: caption.trim() || undefined,
          };
        }

        // 2. Table block
        if (tagName === 'table' || el.classList.contains('audbook-table-wrapper') || el.querySelector('table')) {
          const tableEl = tagName === 'table' ? el : el.querySelector('table');
          return {
            id: `table-${idx}`,
            type: 'table' as const,
            html: tableEl?.outerHTML || el.innerHTML,
          };
        }

        // 3. Horizontal Rule / Divider
        if (tagName === 'hr' || el.classList.contains('audbook-divider')) {
          return {
            id: `divider-${idx}`,
            type: 'divider' as const,
          };
        }

        // 4. Preformatted Code block
        if (tagName === 'pre' || el.classList.contains('audbook-pre')) {
          return {
            id: `code-${idx}`,
            type: 'code' as const,
            code: el.textContent || '',
          };
        }

        // 5. Text block (headings, quotes, list items, paragraphs)
        const isHeading = tagName.startsWith('h') && tagName.length === 2;
        const headingLevel = isHeading ? parseInt(tagName.replace('h', ''), 10) : undefined;

        return {
          id: `text-${pIdx ?? idx}`,
          type: 'text' as const,
          pIdx: pIdx ?? idx,
          tagName,
          isHeading,
          headingLevel,
          isQuote: tagName === 'blockquote',
          isListItem: tagName === 'li',
          rawText: el.textContent || '',
        };
      });
    } catch {
      return [];
    }
  }, [currentChapter?.id, currentChapter?.content]);

  return (
    <article
      className={`mx-auto w-full px-4 pt-8 pb-32 sm:px-6 ${widthClass} ${fontClass} transition-all duration-200 select-text`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <TextSelectionPopover />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Preview"
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] max-w-4xl flex-col items-center justify-center overflow-hidden rounded-2xl bg-[var(--bg-surface)] p-2 shadow-2xl border border-white/10"
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt || 'Illustration'}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
            />
            {lightboxImage.caption && (
              <p className="mt-3 px-4 pb-2 text-center text-xs italic text-[var(--text-secondary)]">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Discreet Resumed Position Notification */}
      {resumedToast && (
        <aside
          aria-label="Reading Location Restored"
          className="fixed top-14 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-[var(--text-ink)] font-medium">
            Resumed at paragraph {resumedToast}
          </span>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentParagraphIndex(0);
              persistProgress(currentChapterIndex, 0, 0, 0);
              setResumedToast(null);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-1"
          >
            <ArrowUp className="h-3 w-3" /> Top
          </button>
        </aside>
      )}

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

      {/* Chapter Paragraphs & Media Container */}
      <div className={`space-y-6 ${alignClass} text-[var(--text-ink)]`}>
        {contentBlocks.length > 0 ? (
          contentBlocks.map((block) => {
            if (block.type === 'figure' && block.src) {
              return (
                <figure
                  key={block.id}
                  className="audbook-figure my-8 flex flex-col items-center justify-center text-center"
                >
                  <img
                    src={block.src}
                    alt={block.alt || 'Book Illustration'}
                    onClick={() =>
                      setLightboxImage({
                        src: block.src,
                        alt: block.alt,
                        caption: block.caption,
                      })
                    }
                    className="audbook-image max-h-[72vh] max-w-full rounded-xl border border-[var(--border-hairline)] object-contain shadow-md cursor-zoom-in"
                    loading="lazy"
                  />
                  {block.caption && (
                    <figcaption className="audbook-caption mt-2.5 text-xs text-[var(--text-muted)] italic font-sans">
                      {block.caption}
                    </figcaption>
                  )}
                </figure>
              );
            }

            if (block.type === 'table') {
              return (
                <div
                  key={block.id}
                  className="audbook-table-wrapper my-6 overflow-x-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/30 p-2"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              );
            }

            if (block.type === 'divider') {
              return (
                <hr
                  key={block.id}
                  className="audbook-divider my-8 border-t border-[var(--border-hairline)] opacity-60"
                />
              );
            }

            if (block.type === 'code') {
              return (
                <pre
                  key={block.id}
                  className="audbook-pre my-4 overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 font-mono text-xs text-[var(--text-ink)] leading-relaxed"
                >
                  <code>{block.code}</code>
                </pre>
              );
            }

            // Text block (with karaoke highlighting)
            const pIdx = block.pIdx;
            const paraToken = chapterTokens?.paragraphs.find(
              (p) => p.paragraphIndex === pIdx
            );

            const pHighlights = currentChapterHighlights.filter(
              (h) => h.paragraphIndex === pIdx
            );

            // Compute precise character ranges for user highlights
            const highlightRanges = paraToken
              ? (pHighlights
                  .map((h) => {
                    const localIdx = paraToken.text.indexOf(h.selectedText);
                    if (localIdx === -1) return null;
                    return {
                      globalStart: paraToken.charStart + localIdx,
                      globalEnd: paraToken.charStart + localIdx + h.selectedText.length,
                      color: h.color,
                    };
                  })
                  .filter(Boolean) as Array<{
                  globalStart: number;
                  globalEnd: number;
                  color: string;
                }>)
              : [];

            let textTagClass =
              'relative my-3 leading-relaxed transition-colors duration-150 cursor-pointer';

            if (block.isHeading) {
              textTagClass +=
                ' chapter-heading font-serif font-bold tracking-tight text-[var(--text-ink)]';
              if (block.headingLevel === 1) textTagClass += ' text-2xl sm:text-3xl my-6';
              else if (block.headingLevel === 2) textTagClass += ' text-xl sm:text-2xl my-5';
              else textTagClass += ' text-lg sm:text-xl my-4';
            } else if (block.isQuote) {
              textTagClass +=
                ' border-l-2 border-blue-500/60 pl-4 italic text-[var(--text-secondary)] my-4 opacity-95';
            } else if (block.isListItem) {
              textTagClass += ' list-disc ml-6 my-1.5';
            }

            return (
              <p
                key={block.id}
                data-p-idx={pIdx}
                onClick={() => jumpToParagraph(pIdx)}
                className={textTagClass}
              >
                {paraToken ? (
                  paraToken.sentences.map((sent) => {
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
                          const isThisWordActive =
                            activeWord !== null &&
                            activeWord.wordIndex === w.wordIndex &&
                            (settings.highlightMode === 'both' ||
                              settings.highlightMode === 'word');

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
                  })
                ) : (
                  block.rawText
                )}
              </p>
            );
          })
        ) : chapterTokens && chapterTokens.paragraphs.length > 0 ? (
          chapterTokens.paragraphs.map((para) => {
            const pIdx = para.paragraphIndex;
            const pHighlights = currentChapterHighlights.filter(
              (h) => h.paragraphIndex === pIdx
            );

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
                        const isThisWordActive =
                          activeWord !== null &&
                          activeWord.wordIndex === w.wordIndex &&
                          (settings.highlightMode === 'both' ||
                            settings.highlightMode === 'word');

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
