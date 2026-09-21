'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { weighingApi, cabinetDepartmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
  Package,
  Scale,
  Network,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DetailRow {
  id: number;
  itemcode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  ModifyDate: string;
  Sign: string;
  item?: { itemname: string | null } | null;
  userCabinet?: {
    legacyUser?: { employee?: { FirstName: string | null; LastName: string | null } | null } | null;
  } | null;
}

function formatDate(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}/${m}/${y} ${h}:${min}`;
}

export default function WeighingDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stockTotal, setStockTotal] = useState(0);
  const [cabinetsCount, setCabinetsCount] = useState(0);
  const [mappingsCount, setMappingsCount] = useState(0);
  const [recentDispense, setRecentDispense] = useState<DetailRow[]>([]);
  const [recentRefill, setRecentRefill] = useState<DetailRow[]>([]);
  const [loadingDispense, setLoadingDispense] = useState(true);
  const [loadingRefill, setLoadingRefill] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [stockRes, cabinetsRes, mappingsRes] = await Promise.all([
          weighingApi.getAll({ page: 1, limit: 1 }),
          weighingApi.getCabinets(),
          cabinetDepartmentApi.getAll({ onlyWeighingCabinets: true }),
        ]);
        if (stockRes?.success && stockRes.pagination) {
          setStockTotal(stockRes.pagination.total ?? 0);
        }
        if (cabinetsRes?.success && Array.isArray(cabinetsRes.data)) {
          setCabinetsCount(cabinetsRes.data.length);
        }
        if (mappingsRes?.success && Array.isArray(mappingsRes.data)) {
          setMappingsCount(mappingsRes.data.length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadDispense = async () => {
      setLoadingDispense(true);
      try {
        const res = await weighingApi.getDetailsBySign({
          sign: '-',
          page: 1,
          limit: 5,
        });
        if (res?.success && Array.isArray(res.data)) {
          setRecentDispense(res.data);
        } else {
          setRecentDispense([]);
        }
      } catch {
        setRecentDispense([]);
      } finally {
        setLoadingDispense(false);
      }
    };
    loadDispense();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadRefill = async () => {
      setLoadingRefill(true);
      try {
        const res = await weighingApi.getDetailsBySign({
          sign: '+',
          page: 1,
          limit: 5,
        });
        if (res?.success && Array.isArray(res.data)) {
          setRecentRefill(res.data);
        } else {
          setRecentRefill([]);
        }
      } catch {
        setRecentRefill([]);
      } finally {
        setLoadingRefill(false);
      }
    };
    loadRefill();
  }, [user?.id]);

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl shadow-sm">
              <Scale className="h-7 w-7 text-slate-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ภาพรวม Weighing</h1>
              <p className="text-sm text-gray-500 mt-0.5">สรุปข้อมูลตู้ Weighing และการเบิก-เติม</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/admin/weighing-stock">
              <Card className="shadow-sm border-gray-200/80 hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">รายการสต๊อกในตู้</p>
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stockTotal.toLocaleString()}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">ช่องที่มีสต๊อก</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/weighing-departments">
              <Card className="shadow-sm border-gray-200/80 hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">ตู้ Weighing</p>
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-gray-900 mt-1">{cabinetsCount}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">ตู้ที่มีสต๊อก</p>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <Scale className="h-6 w-6 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Card className="shadow-sm border-gray-200/80 h-full">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">การเชื่อมโยงตู้-แผนก</p>
                    {loading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 mt-1">{mappingsCount}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">รายการ</p>
                  </div>
                  <div className="p-3 bg-violet-100 rounded-xl">
                    <Network className="h-6 w-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent dispense & refill */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-200/80 overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                  เบิกล่าสุด
                </CardTitle>
                <Link
                  href="/admin/weighing-dispense"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  ดูทั้งหมด <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDispense ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : recentDispense.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">ไม่มีรายการเบิกล่าสุด</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentDispense.map((row) => (
                      <li key={row.id} className="px-4 py-3 hover:bg-gray-50/80">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {row.item?.itemname || row.itemcode || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {row.userCabinet?.legacyUser?.employee
                                ? [row.userCabinet.legacyUser.employee.FirstName, row.userCabinet.legacyUser.employee.LastName]
                                    .filter(Boolean)
                                    .join(' ') || '-'
                                : '-'}{' '}
                              · จำนวน {row.Qty}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{formatDate(row.ModifyDate)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200/80 overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                  เติมล่าสุด
                </CardTitle>
                <Link
                  href="/admin/weighing-refill"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  ดูทั้งหมด <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loadingRefill ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : recentRefill.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">ไม่มีรายการเติมล่าสุด</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentRefill.map((row) => (
                      <li key={row.id} className="px-4 py-3 hover:bg-gray-50/80">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {row.item?.itemname || row.itemcode || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {row.userCabinet?.legacyUser?.employee
                                ? [row.userCabinet.legacyUser.employee.FirstName, row.userCabinet.legacyUser.employee.LastName]
                                    .filter(Boolean)
                                    .join(' ') || '-'
                                : '-'}{' '}
                              · จำนวน {row.Qty}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{formatDate(row.ModifyDate)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick links */}
          <Card className="shadow-sm border-gray-200/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">เมนูที่เกี่ยวข้อง</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/weighing-departments"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 text-sm font-medium transition-colors"
                >
                  <Network className="h-4 w-4" />
                  จัดการตู้ Weighing - แผนก
                </Link>
                <Link
                  href="/admin/weighing-stock"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors"
                >
                  <Package className="h-4 w-4" />
                  สต๊อกอุปกรณ์ในตู้
                </Link>
                <Link
                  href="/admin/weighing-dispense"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium transition-colors"
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  เบิกอุปกรณ์จากตู้
                </Link>
                <Link
                  href="/admin/weighing-refill"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium transition-colors"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  เติมอุปกรณ์เข้าตู้
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
