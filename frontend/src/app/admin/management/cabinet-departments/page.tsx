'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import CabinetDivisionTab from '@/app/admin/management/cabinets/components/cabinet-division-tab/CabinetแผนกTab';

export default function ItemStockDepartmentsPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <CabinetDivisionTab />
      </AppLayout>
    </ProtectedRoute>
  );
}
