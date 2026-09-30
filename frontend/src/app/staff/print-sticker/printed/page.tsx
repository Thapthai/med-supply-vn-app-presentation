'use client';

import { useEffect, useState } from 'react';
import { PrintStickerPrintedPreviewTab } from '@/components/print-sticker/PrintStickerPrintedPreviewTab';
import type { PrintStickerConfirmLine } from '@/components/print-sticker/PrintStickerConfirmDialog';
import { loadPrintedStickerBatch } from '@/components/print-sticker/printedStickerBatch';

export default function StaffPrintedStickerPreviewPage() {
  const [lines, setLines] = useState<PrintStickerConfirmLine[]>([]);

  useEffect(() => {
    setLines(loadPrintedStickerBatch());
  }, []);

  return (
    <div className="min-h-screen bg-white px-4">
      <PrintStickerPrintedPreviewTab lines={lines} />
    </div>
  );
}
