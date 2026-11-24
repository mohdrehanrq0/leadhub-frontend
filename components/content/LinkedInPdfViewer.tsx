'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { IconChevronLeft, IconChevronRight, IconFileText } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

type Props = {
  fileUrl: string;
  fileName: string;
  className?: string;
};

/**
 * LinkedIn-style document carousel: one page at a time with side arrows.
 */
export function LinkedInPdfViewer({ fileUrl, fileName, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setPageNumber(1);
    setNumPages(0);
    setLoadError(false);
  }, [fileUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => observer.disconnect();
  }, []);

  const canPrev = pageNumber > 1;
  const canNext = numPages > 0 && pageNumber < numPages;

  return (
    <div className={cn('bg-[#f4f2ee]', className)}>
      <div ref={containerRef} className="relative w-full overflow-hidden bg-[#e9e5df]">
        {loadError ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-slate-600">
            <IconFileText size={28} className="text-slate-400" />
            <span>Couldn&apos;t preview this PDF</span>
            <span className="max-w-[90%] truncate text-xs text-slate-400">{fileName}</span>
          </div>
        ) : (
          <Document
            file={fileUrl}
            loading={
              <div className="flex h-56 items-center justify-center text-sm text-slate-500">
                Loading PDF…
              </div>
            }
            error={
              <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-slate-600">
                <IconFileText size={28} className="text-slate-400" />
                <span>Couldn&apos;t preview this PDF</span>
              </div>
            }
            onLoadSuccess={({ numPages: pages }) => {
              setNumPages(pages);
              setLoadError(false);
              setPageNumber((p) => Math.min(Math.max(1, p), pages));
            }}
            onLoadError={() => setLoadError(true)}
            suspense={false}
            className="flex justify-center"
          >
            {width > 0 ? (
              <Page
                pageNumber={pageNumber}
                width={width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div
                    className="flex items-center justify-center bg-white"
                    style={{ width, minHeight: Math.round(width * 1.29) }}
                  >
                    <span className="text-sm text-slate-400">Rendering page…</span>
                  </div>
                }
                className="shadow-sm"
              />
            ) : (
              <div className="h-56 w-full" />
            )}
          </Document>
        )}

        {numPages > 1 && !loadError ? (
          <>
            <button
              type="button"
              aria-label="Previous page"
              disabled={!canPrev}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className={cn(
                'absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition',
                canPrev
                  ? 'text-slate-700 hover:bg-slate-50'
                  : 'pointer-events-none opacity-0',
              )}
            >
              <IconChevronLeft size={20} stroke={2.25} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={!canNext}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              className={cn(
                'absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition',
                canNext
                  ? 'text-slate-700 hover:bg-slate-50'
                  : 'pointer-events-none opacity-0',
              )}
            >
              <IconChevronRight size={20} stroke={2.25} />
            </button>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
              {pageNumber} / {numPages}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200/80 bg-white px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#0a66c2]/10 text-[#0a66c2]">
          <IconFileText size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{fileName}</p>
          {numPages > 0 && !loadError ? (
            <p className="text-xs text-slate-500">
              {numPages} {numPages === 1 ? 'page' : 'pages'}
            </p>
          ) : (
            <p className="text-xs text-slate-500">Document</p>
          )}
        </div>
      </div>
    </div>
  );
}
