'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MappingSummary {
  total: number;
  cabinets: number;
  departments: number;
}

interface DispensedVsUsageChartCardProps {
  /** สรุปการเชื่อมโยง - แสดงเป็นการ์ดเล็กแบบอุปกรณ์ใกล้หมดอายุ */
  mappingSummary?: MappingSummary | null;
  loadingMappings?: boolean;
  className?: string;
}

export default function DispensedVsUsageChartCard({
  mappingSummary,
  loadingMappings = false,
  className,
}: DispensedVsUsageChartCardProps) {
  const totalMappings = mappingSummary?.total ?? 0;
  const cabinets = mappingSummary?.cabinets ?? 0;
  const departments = mappingSummary?.departments ?? 0;

  return (
    <Card className={cn('h-full gap-2 py-3 bg-gradient-to-br from-indigo-500 to-violet-600 border-0 text-white overflow-hidden shadow-lg relative flex flex-col', className)}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-sm font-medium text-white/95 flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          สรุปการเชื่อมโยง
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {loadingMappings ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-white/80" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/25 px-3 py-1.5">
              <p className="text-[11px] font-medium text-white/80">รายการ</p>
              <p className="text-lg font-bold leading-tight">{totalMappings}</p>
            </div>
            <div className="rounded-lg bg-white/25 px-3 py-1.5">
              <p className="text-[11px] font-medium text-white/80">ตู้</p>
              <p className="text-lg font-bold leading-tight">{cabinets}</p>
            </div>
            <div className="rounded-lg bg-white/25 px-3 py-1.5">
              <p className="text-[11px] font-medium text-white/80">แผนก</p>
              <p className="text-lg font-bold leading-tight">{departments}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
