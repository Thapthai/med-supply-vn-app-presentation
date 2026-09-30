'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PrintStickerPrintedPreviewTab } from '@/components/print-sticker/PrintStickerPrintedPreviewTab';
import type { PrintStickerConfirmLine } from '@/components/print-sticker/PrintStickerConfirmDialog';
import { loadPrintedStickerBatch } from '@/components/print-sticker/printedStickerBatch';

export default function AdminPrintedStickerPreviewPage() {
  const [lines, setLines] = useState<PrintStickerConfirmLine[]>([]);

  useEffect(() => {
    setLines(loadPrintedStickerBatch());
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white px-4">
        <PrintStickerPrintedPreviewTab lines={lines} />
      </div>
    </ProtectedRoute>
  );
}
