'use client';

import { useEffect, useMemo, useState } from 'react';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import {
  ExpirySummaryCard,
  ExpiryListCard,
  splitExpiryLists,
  type ItemWithExpiry,
} from './components/ItemsWithExpirySidebar';
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardMappingsTable, { type CabinetDepartment } from './components/DashboardMappingsTable';
import DispensedVsUsageChartCard from './components/DispensedVsUsageChartCard';
import CabinetTempHumChartCard from './components/CabinetTempHumChartCard';
import { DASHBOARD_ROW2_CARD_HEIGHT_CLASS } from '@/app/admin/dashboard/dashboardRow2Layout';

export default function DashboardPage() {
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
  const { expired, near7 } = useMemo(() => splitExpiryLists(itemsWithExpiry), [itemsWithExpiry]);

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const response = await staffItemsApi.getStats();

        if (response.success && response.data) {
          const data = response.data as {
            details?: { total_item_types?: number; total_items?: number; item_types_with_stock?: number; active_items?: number; inactive_items?: number; low_stock_items?: number };
            total_item_types?: number;
            total_items?: number;
            item_types_with_stock?: number;
            active_items?: number;
            inactive_items?: number;
            low_stock_items?: number;
            item_stock?: { expire?: { expired_count?: number; near_expire_7_days?: number }; items_with_expiry?: ItemWithExpiry[] };
          };
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
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch เบิก vs ใช้ โดยรวม (สำหรับกราฟ)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoadingDispensedVsUsage(true);
        const response = await staffMedicalSuppliesApi.getDispensedVsUsageSummary();
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
  }, []);

  // Fetch รายการเชื่อมโยง (ตู้-แผนก) - ข้อมูลเดียวกับ cabinet-departments
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        setLoadingMappings(true);
        const response = await staffCabinetDepartmentApi.getAll();
        if (response.success && response.data) {
          setMappings(response.data as CabinetDepartment[]);
        } else {
          setMappings([]);
        }
      } catch (error) {
        console.error('Failed to fetch cabinet-department mappings:', error);
        setMappings([]);
      } finally {
        setLoadingMappings(false);
      }
    };

    fetchMappings();
  }, []);

  // Reserved for StatsCards when uncommented: stats, dispensedVsUsageSummary, loadingDispensedVsUsage
  void stats;
  void dispensedVsUsageSummary;
  void loadingDispensedVsUsage;

  return (
    <>
      {/* <DashboardHeader userName={user?.name} /> */}

      {/* <StatsCards
        loading={loadingStats}
        stats={stats}
        dispensedVsUsage={dispensedVsUsageSummary}
        loadingDispensedVsUsage={loadingDispensedVsUsage}
      /> */}

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <DispensedVsUsageChartCard
            mappingSummary={{
              total: mappings.length,
              cabinets: new Set(mappings.map((m) => m.cabinet_id)).size,
              departments: new Set(mappings.map((m) => m.department_id)).size,
            }}
            loadingMappings={loadingMappings}
          />
          <ExpirySummaryCard
            expiredCount={expiredCount}
            nearExpire7Days={nearExpire7Days}
            loading={loadingStats}
          />
        </div>
        <div
          className={`grid grid-cols-1 gap-6 items-stretch lg:grid-cols-4 lg:items-stretch ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}
        >
          <div className={`flex min-h-0 h-full flex-col lg:col-span-2 ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}>
            <DashboardMappingsTable mappings={mappings} loading={loadingMappings} />
          </div>
          {loadingStats ? (
            <>
              <Card className={`flex h-full min-h-0 flex-col gap-0 py-0 ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}>
                <CardContent className="flex flex-1 items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
              </Card>
              <Card className={`flex h-full min-h-0 flex-col gap-0 py-0 ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}>
                <CardContent className="flex flex-1 items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className={`flex min-h-0 h-full flex-col ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}>
                <ExpiryListCard
                  icon={
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>รายการหมดอายุ</span>
                    </>
                  }
                  items={expired}
                  emptyLabel="ไม่มีรายการหมดอายุ"
                  listKey="expired"
                  className="flex-1"
                />
              </div>
              <div className={`flex min-h-0 h-full flex-col ${DASHBOARD_ROW2_CARD_HEIGHT_CLASS}`}>
                <ExpiryListCard
                  icon={
                    <>
                      <CalendarClock className="h-4 w-4 text-amber-600" />
                      <span>รายการใกล้หมดอายุ 7 วัน</span>
                    </>
                  }
                  items={near7}
                  emptyLabel="ไม่มีรายการใกล้หมดอายุภายใน 7 วัน"
                  listKey="near"
                  className="flex-1"
                />
              </div>
            </>
          )}
        </div>
        <CabinetTempHumChartCard />
      </div>
    </>
  );
}
