'use client';

import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, Package, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import { cn } from '@/lib/utils';
import { DASHBOARD_ROW2_CARD_HEIGHT_CLASS } from '@/app/admin/dashboard/dashboardRow2Layout';

export interface ItemWithExpiry {
  RowID: number;
  ItemCode: string | null;
  itemname: string | null;
  ExpireDate: string | null;
  วันหมดอายุ: string | null;
  RfidCode: string | null;
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
}

const EXPIRY_ITEMS_PER_PAGE = 5;

function getExpiryRaw(item: ItemWithExpiry): string | null {
  return item.ExpireDate ?? item.วันหมดอายุ;
}

function getDaysLeft(expireDate: string | null): number | null {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : null;
}

export function splitExpiryLists(items: ItemWithExpiry[]) {
  const expired: ItemWithExpiry[] = [];
  const near7: ItemWithExpiry[] = [];
  for (const item of items) {
    const d = getDaysLeft(getExpiryRaw(item));
    if (d === null) continue;
    if (d <= 0) expired.push(item);
    else if (d >= 1 && d <= 7) near7.push(item);
  }
  return { expired, near7 };
}

type ExpiryRowProps = {
  item: ItemWithExpiry;
  variant: 'expired' | 'near';
};

function ExpiryRow({ item, variant }: ExpiryRowProps) {
  const daysLeft = getDaysLeft(getExpiryRaw(item));
  const isUrgentNear = variant === 'near' && daysLeft !== null && daysLeft <= 3;
  const dateLabel =
    item.วันหมดอายุ || (item.ExpireDate ? formatUtcDateTime(item.ExpireDate) : '-');

  const rowClass = cn(
    'shrink-0 rounded-lg border px-2 py-1.5 transition-shadow hover:shadow-sm',
    variant === 'expired' && 'border-red-200/90 bg-red-50/70',
    variant === 'near' &&
      (isUrgentNear ? 'border-amber-300/90 bg-amber-50/80' : 'border-amber-200/80 bg-amber-50/60'),
  );
  const iconClass = cn(
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white',
    variant === 'expired' && 'bg-red-600',
    variant === 'near' && (isUrgentNear ? 'bg-amber-600' : 'bg-amber-500'),
  );

  return (
    <div className={rowClass}>
      <div className="flex items-center gap-2">
        <div className={iconClass}>
          <Package className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-medium leading-tight text-slate-900"
            title={item.itemname ?? undefined}
          >
            {item.itemname || item.ItemCode || '-'}
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{dateLabel}</span>
      </div>
    </div>
  );
}

type ExpiryListCardProps = {
  icon: ReactNode;
  items: ItemWithExpiry[];
  emptyLabel: string;
  listKey: 'expired' | 'near';
  className?: string;
};

export function ExpiryListCard({ icon, items, emptyLabel, listKey, className }: ExpiryListCardProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / EXPIRY_ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [items.length, listKey]);

  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * EXPIRY_ITEMS_PER_PAGE;
  const paginated = items.slice(startIdx, startIdx + EXPIRY_ITEMS_PER_PAGE);
  const listFillsPage = paginated.length >= EXPIRY_ITEMS_PER_PAGE;
  /** รายการหมดอายุ: pagination ล่างการ์ดคงที่ทุกหน้า */
  const pinPaginationToBottom = listKey === 'expired' || listFillsPage;

  return (
    <Card
      className={cn(
        'flex h-full min-h-0 flex-col gap-0 overflow-hidden border-slate-200/80 py-0 shadow-sm',
        DASHBOARD_ROW2_CARD_HEIGHT_CLASS,
        className,
      )}
    >
      <CardHeader className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-2 sm:px-5 [.border-b]:pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-800">{icon}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-1.5 sm:px-5">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center text-sm text-slate-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            {emptyLabel}
          </div>
        ) : (
          <>
            <div className="max-h-full shrink-0 space-y-1.5 overflow-y-auto pr-1">
              {paginated.map((item) => (
                <ExpiryRow key={`${listKey}-${item.RowID}-${item.ItemCode}`} item={item} variant={listKey} />
              ))}
            </div>
            {totalPages > 1 ? (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-between border-t border-slate-100 pb-0 pt-1',
                  pinPaginationToBottom && 'mt-auto',
                )}
              >
                <span className="text-xs text-slate-500">
                  หน้า {safePage} จาก {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : pinPaginationToBottom ? (
              <div className="mt-auto min-h-0 shrink-0" aria-hidden />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ExpirySummaryCardProps {
  expiredCount: number;
  nearExpire7Days: number;
  loading?: boolean;
  className?: string;
}

export function ExpirySummaryCard({
  expiredCount,
  nearExpire7Days,
  loading = false,
  className,
}: ExpirySummaryCardProps) {
  return (
    <Card
      className={cn(
        'h-full gap-2 py-3 bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white overflow-hidden shadow-lg relative flex flex-col',
        className,
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-sm font-medium text-white/95">อุปกรณ์ใกล้หมดอายุ</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/80" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/25 px-3 py-1.5">
              <p className="text-[11px] font-medium text-white/80">หมดอายุแล้ว</p>
              <p className="text-lg font-bold leading-tight">{expiredCount}</p>
            </div>
            <div className="rounded-lg bg-white/25 px-3 py-1.5">
              <p className="text-[11px] font-medium text-white/80">ใกล้หมดอายุ 7 วัน</p>
              <p className="text-lg font-bold leading-tight">{nearExpire7Days}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ItemsWithExpirySidebarProps {
  itemsWithExpiry: ItemWithExpiry[];
  expiredCount: number;
  nearExpire7Days: number;
  loading?: boolean;
  hideSummary?: boolean;
}

export default function ItemsWithExpirySidebar({
  itemsWithExpiry,
  expiredCount,
  nearExpire7Days,
  loading = false,
  hideSummary = false,
}: ItemsWithExpirySidebarProps) {
  const { expired, near7 } = useMemo(() => splitExpiryLists(itemsWithExpiry), [itemsWithExpiry]);

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-4">
        {!hideSummary && (
          <ExpirySummaryCard expiredCount={0} nearExpire7Days={0} loading />
        )}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="py-8 flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="py-8 flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {!hideSummary && (
        <ExpirySummaryCard expiredCount={expiredCount} nearExpire7Days={nearExpire7Days} />
      )}

      <div className="flex-1 min-h-0 flex flex-col gap-4">
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
        />
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
        />
      </div>
    </div>
  );
}
