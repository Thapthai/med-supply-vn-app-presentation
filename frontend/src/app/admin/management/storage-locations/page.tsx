'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import StorageLocationWizard from './components/StorageLocationWizard';
import { Layers } from 'lucide-react';

export default function AdminStorageLocationsPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Layers className="h-7 w-7 text-indigo-600" />
              ตำแหน่งจัดเก็บอุปกรณ์
            </h1>
          </div>

          <StorageLocationWizard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
