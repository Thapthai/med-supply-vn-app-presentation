'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { itemsApi, medicalSuppliesApi, cabinetDepartmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import type { ItemWithExpiry } from './components/ItemsWithExpirySidebar';
import StatsCards from './components/StatsCards';
import DashboardMappingsTable, { type CabinetDepartment } from './components/DashboardMappingsTable';
import DispensedVsUsageChartCard from './components/DispensedVsUsageChartCard';
import CabinetTempHumChartCard from './components/CabinetTempHumChartCard';
import ItemsWithExpirySidebar from './components/ItemsWithExpirySidebar';

export default function DashboardPage() {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<CabinetDepartment[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
    lowStockItems: 0,
  });
  const [itemsWithExpiry, setItemsWithExpiry] = useState<ItemWithExpiry[]>([]);
  const [expiredCount, setExpiredCount] = useState(0);
  const [nearExpire7Days, setNearExpire7Days] = useState(0);
  const [dispensedVsUsageSummary, setDispensedVsUsageSummary] = useState<{
    total_dispensed: number;
    total_used: number;
    difference: number;
  } | null>(null);
  const [loadingDispensedVsUsage, setLoadingDispensedVsUsage] = useState(false);

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.id) {
          setLoadingStats(true);
          const response = await itemsApi.getStats();

          if (response.success && response.data) {
            const data = response.data as any;
            const d = data.details ?? data;
            setStats({
              totalItems: d.total_item_types ?? d.total_items ?? 0,
              activeItems: d.item_types_with_stock ?? d.active_items ?? 0,
              inactiveItems: d.inactive_items ?? 0,
              lowStockItems: d.low_stock_items ?? 0,
            });
            const itemStock = data.item_stock;
            if (itemStock) {
              setExpiredCount(itemStock.expire?.expired_count ?? 0);
              setNearExpire7Days(itemStock.expire?.near_expire_7_days ?? 0);
              setItemsWithExpiry(Array.isArray(itemStock.items_with_expiry) ? itemStock.items_with_expiry : []);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  // Fetch เบิก vs ใช้ โดยรวม (สำหรับกราฟ)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoadingDispensedVsUsage(true);
        const response = await medicalSuppliesApi.getDispensedVsUsageSummary();
        if (response.success && response.data) {
          setDispensedVsUsageSummary(response.data);
        } else {
          setDispensedVsUsageSummary(null);
        }
      } catch (error) {
        console.error('Failed to fetch dispensed vs usage summary:', error);
        setDispensedVsUsageSummary(null);
      } finally {
        setLoadingDispensedVsUsage(false);
      }
    };
    fetchSummary();
  }, [user?.id]);

  // Fetch รายการเชื่อมโยง (ตู้-แผนก) - ข้อมูลเดียวกับ cabinet-departments
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        if (user?.id) {
          setLoadingMappings(true);
          const response = await cabinetDepartmentApi.getAll();
          if (response.success && response.data) {
            setMappings(response.data as CabinetDepartment[]);
          } else {
            setMappings([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cabinet-department mappings:', error);
        setMappings([]);
      } finally {
        setLoadingMappings(false);
      }
    };

    fetchMappings();
  }, [user?.id]);

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        {/* <DashboardHeader userName={user?.name} /> */}

        {/* <StatsCards
          loading={loadingStats}
          stats={stats}
          dispensedVsUsage={dispensedVsUsageSummary}
          loadingDispensedVsUsage={loadingDispensedVsUsage}
        /> */}

        {/* แถว 1: สรุปการเชื่อมโยง (เล็ก) + รายการเชื่อมโยง (ตาราง) | Card อุปกรณ์ใกล้หมดอายุ ความสูงเท่ากัน */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <DispensedVsUsageChartCard
              mappingSummary={{
                total: mappings.length,
                cabinets: new Set(mappings.map((m) => m.cabinet_id)).size,
                departments: new Set(mappings.map((m) => m.department_id)).size,
              }}
              loadingMappings={loadingMappings}
            />
            <CabinetTempHumChartCard />
            <DashboardMappingsTable mappings={mappings} loading={loadingMappings} />
          </div>
          <div className="lg:col-span-1 h-full min-h-0 flex flex-col">
            <ItemsWithExpirySidebar
              itemsWithExpiry={itemsWithExpiry}
              expiredCount={expiredCount}
              nearExpire7Days={nearExpire7Days}
              loading={loadingStats}
            />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
