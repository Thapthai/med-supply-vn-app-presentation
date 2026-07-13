'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import DepartmentDispenseWizard from './components/DepartmentDispenseWizard';
import { ClipboardList } from 'lucide-react';

export default function AdminDepartmentDispensePage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-indigo-600" />
              เบิกอุปกรณ์ให้หน่วยงาน
            </h1>
          </div>

          <DepartmentDispenseWizard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
