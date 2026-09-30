'use client';

import { useState } from 'react';
import type { PrintStickerConfirmLine } from './PrintStickerConfirmDialog';
import { StickerLabelPreview } from './StickerLabelPreview';
import { StickerPreviewZoom } from './StickerPreviewZoom';

type PrintStickerPrintedPreviewTabProps = {
  lines: PrintStickerConfirmLine[];
};

export function PrintStickerPrintedPreviewTab({ lines }: PrintStickerPrintedPreviewTabProps) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const zoomLine = zoomIndex != null ? lines[zoomIndex] ?? null : null;

  if (lines.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">ยังไม่มีตัวอย่างสติ๊กเกอร์</p>;
  }

  return (
    <div className="flex flex-col items-start gap-6 py-4">
      {lines.map((line, index) => (
        <button
          key={`${line.itemcode}-${line.usageCode ?? index}`}
          type="button"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="ขยายตัวอย่าง"
          onClick={() => setZoomIndex(index)}
        >
          <StickerLabelPreview line={line} size="hero" />
        </button>
      ))}
      <StickerPreviewZoom
        open={zoomLine != null}
        line={zoomLine}
        onClose={() => setZoomIndex(null)}
      />
    </div>
  );
}
