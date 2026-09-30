import type { PrintStickerConfirmLine } from './PrintStickerConfirmDialog';

const STORAGE_KEY = 'print-sticker:last-batch';

export function savePrintedStickerBatch(lines: PrintStickerConfirmLine[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, at: Date.now() }));
}

export function loadPrintedStickerBatch(): PrintStickerConfirmLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lines?: PrintStickerConfirmLine[] };
    return Array.isArray(parsed.lines) ? parsed.lines : [];
  } catch {
    return [];
  }
}

export function openPrintedStickerPreviewPage() {
  if (typeof window === 'undefined') return;
  const prefix = window.location.pathname.match(/^(.*?)(?:\/admin|\/staff)\/print-sticker/)?.[1] ?? '';
  window.open(
    `${window.location.origin}${prefix}/print-sticker-preview`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function openPrintedStickerPreviews(lines: PrintStickerConfirmLine[]) {
  savePrintedStickerBatch(lines);
  openPrintedStickerPreviewPage();
}
