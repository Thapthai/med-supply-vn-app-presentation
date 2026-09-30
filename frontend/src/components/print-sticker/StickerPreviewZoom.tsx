'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StickerLabelPreview } from './StickerLabelPreview';
import type { PrintStickerConfirmLine } from './PrintStickerConfirmDialog';

type StickerPreviewZoomProps = {
  open: boolean;
  line: PrintStickerConfirmLine | null;
  onClose: () => void;
};

export function StickerPreviewZoom({ open, line, onClose }: StickerPreviewZoomProps) {
  if (!open || !line) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ pointerEvents: 'auto' }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-[580px] rounded-xl bg-white p-5 shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">ตัวอย่างสติ๊กเกอร์</p>
            <p className="truncate text-sm text-slate-500">
              {line.itemcode} · {line.itemname || '—'}
              {line.copies > 1 ? ` · พิมพ์ ${line.copies} แผ่น` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">ปิด</span>
          </Button>
        </div>
        <div className="flex justify-center">
          <StickerLabelPreview line={line} size="zoom" />
        </div>
      </div>
    </div>
  );
}
