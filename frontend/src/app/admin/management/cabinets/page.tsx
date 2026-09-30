'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Package } from 'lucide-react';
import CabinetTab from './components/cabinet-tab/CabinetTab';

export default function CabinetsPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">จัดการตู้ Cabinet</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                ดูและแก้ไขตู้ เชื่อมโยง Division และจัดการแผนกได้จากหน้าเดียว
              </p>
            </div>
          </div>

          <CabinetTab />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
