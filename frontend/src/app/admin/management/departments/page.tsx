'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import DivisionTab from '@/app/admin/management/cabinets/components/division-tab/DivisionTab';

export default function DepartmentManagementPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <DivisionTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
