'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import PrintStickerTab from '@/app/admin/print-sticker/PrintStickerTab';

export default function AdminPrintStickerPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <PrintStickerTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
