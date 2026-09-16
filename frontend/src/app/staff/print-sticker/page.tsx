'use client';

import { PrintStickerItemListCard } from '@/app/staff/print-sticker/components/PrintStickerItemListCard';
import PrintStickerFilterShell from '@/app/staff/print-sticker/components/PrintStickerFilterShell';
import PrintStickerHeader from '@/app/staff/print-sticker/components/PrintStickerHeader';
import { usePrintStickerTab } from '@/app/staff/print-sticker/usePrintStickerTab';

export default function StaffPrintStickerPage() {

  const s = usePrintStickerTab();
  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <PrintStickerHeader />

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
    </>
  );
}
