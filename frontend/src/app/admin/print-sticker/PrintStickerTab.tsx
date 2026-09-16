'use client';

import { PrintStickerItemListCard } from '@/app/admin/management/print-sticker/components/PrintStickerItemListCard';
import PrintStickerFilterCard from './components/PrintStickerFilterCard';
import PrintStickerHeader from './components/PrintStickerHeader';
import { usePrintStickerTab } from './usePrintStickerTab';

export default function PrintStickerTab() {
  const s = usePrintStickerTab();

  return (
    <div className="flex w-full flex-col gap-6">
      <PrintStickerHeader />

      <PrintStickerFilterCard
        mode={s.mode}
        onModeChange={s.setMode}
        departmentId={s.departmentId}
        onDepartmentIdChange={s.setDepartmentId}
        cabinetId={s.cabinetId}
        onCabinetIdChange={s.setCabinetId}
        departmentSelectOptions={s.departmentSelectOptions}
        cabOptions={s.cabOptions}
        loadingDepartments={s.loadingDepartments}
        loadingCabinets={s.loadingCabinets}
        onSearchDepartments={(kw) => void s.loadDepartments(kw)}
        onSearchCabinets={(kw) => void s.resolveCabinets(s.departmentId, kw)}
        manualFilterIncomplete={s.manualFilterIncomplete}
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
        cabinetLabel={s.cabOptions.find((c) => c.value === s.cabinetId)?.label}
        variant={s.cabinetPairSelected ? 'cabinet' : 'master'}
        hidePagination={s.hidePagination}
      />
    </div>
  );
}
