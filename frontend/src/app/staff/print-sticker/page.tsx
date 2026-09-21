'use client';

import { useMemo, useState } from 'react';
import { History, Printer } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { staffStickerPrintApi } from '@/lib/staffApi/stickerPrintApi';
import { fetchStaffDepartmentsForFilter } from '@/lib/staffDepartmentScope';
import PrintStickerHistoryTab, {
  type PrintStickerHistoryApis,
} from '@/app/admin/print-sticker/components/PrintStickerHistoryTab';
import { PrintStickerItemListCard } from '@/app/staff/print-sticker/components/PrintStickerItemListCard';
import PrintStickerFilterShell from '@/app/staff/print-sticker/components/PrintStickerFilterShell';
import PrintStickerHeader from '@/app/staff/print-sticker/components/PrintStickerHeader';
import { usePrintStickerTab } from '@/app/staff/print-sticker/usePrintStickerTab';

const TABS = [
  {
    value: 'print',
    label: 'พิมพ์สติ๊กเกอร์',
    icon: Printer,
    iconClass: 'bg-slate-100 text-slate-700',
  },
  {
    value: 'history',
    label: 'ประวัติการพิมพ์สติ๊กเกอร์',
    icon: History,
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
] as const;

function StaffPrintStickerForm() {
  const s = usePrintStickerTab();
  return (
    <div className="flex w-full flex-col gap-6">
      <PrintStickerFilterShell
        mode={s.mode}
        onModeChange={s.setMode}
        departmentId={s.departmentId}
        cabinetId={s.cabinetId}
        cabinetStockId={s.cabinetStockId}
        onDepartmentIdChange={s.setDepartmentId}
        onCabinetIdChange={s.setCabinetId}
        reloadDisabled={s.reloadDisabled}
        reloadButtonLabel={s.reloadButtonLabel}
        loadingList={s.loadingList}
        onReload={() => void s.fetchCabinetItems()}
      />

      <PrintStickerItemListCard
        items={s.displayItems}
        loadingList={s.loadingList}
        total={s.listTotal}
        page={s.mode === 'auto' ? 1 : s.page}
        totalPages={s.listTotalPages}
        keywordInput={s.keywordInput}
        onKeywordInputChange={s.setKeywordInput}
        onSearch={s.handleSearch}
        onClearKeyword={s.handleClearKeyword}
        onPageChange={s.handlePageChange}
        selectedLines={s.selectedLines}
        onSetCopies={s.setCopiesFor}
        onExpireDateChange={s.setExpireDateFor}
        onLotNoChange={s.setLotNoFor}
        onPrintSelected={s.handlePrepareAndPrint}
        printing={s.printing}
        preparing={s.preparing}
        mode={s.mode}
        variant={s.cabinetPairSelected ? 'cabinet' : 'master'}
        hidePagination={s.hidePagination}
      />
    </div>
  );
}

export default function StaffPrintStickerPage() {
  const [activeTab, setActiveTab] = useState<string>('print');
  const historyApis = useMemo<PrintStickerHistoryApis>(
    () => ({
      listHistory: staffStickerPrintApi.listHistory,
      getDepartments: async (keyword) => {
        const rows = await fetchStaffDepartmentsForFilter({ keyword, limit: 80 });
        return {
          success: true,
          data: rows.map((d) => ({
            ID: d.ID,
            DepName: d.DepName ?? undefined,
            DepName2: d.DepName2 ?? undefined,
          })),
        };
      },
      getCabinetMappings: ({ departmentId, keyword }) =>
        staffCabinetDepartmentApi.getAll({
          departmentId,
          keyword: keyword || undefined,
        }),
    }),
    [],
  );

  return (
    <>
      <div className="space-y-6">
        <PrintStickerHeader />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                          ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                          : 'border-slate-200 hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          tab.iconClass,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 space-y-0.5">
                        <span className="block text-base font-medium text-slate-900 sm:text-lg">
                          {tab.label}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <TabsContent value="print">
            <StaffPrintStickerForm />
          </TabsContent>

          <TabsContent value="history">
            <PrintStickerHistoryTab apis={historyApis} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
