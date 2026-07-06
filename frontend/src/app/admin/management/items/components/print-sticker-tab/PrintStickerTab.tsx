'use client';

import { PrintStickerItemListCard } from '@/app/admin/management/print-sticker/components/PrintStickerItemListCard';
import { PrintStickerOrderCard } from '@/app/admin/management/print-sticker/components/PrintStickerOrderCard';
import PrintStickerFilterCard from './components/PrintStickerFilterCard';
import PrintStickerHeader from './components/PrintStickerHeader';
import PrintStickerPreparedCard from './components/PrintStickerPreparedCard';
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
        cabinetStockId={s.cabinetStockId}
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
        onRefresh={s.fetchCabinetItems}
        onSelectAllOnPage={s.selectAllOnPage}
        onClearSelectionOnPage={s.clearSelectionOnPage}
        onPageChange={s.handlePageChange}
        selectedItemcodes={s.selectedItemcodes}
        onToggleRow={s.toggleRow}
        variant={s.cabinetPairSelected ? 'cabinet' : 'master'}
        hidePagination={s.hidePagination}
      />

      <PrintStickerOrderCard
        selectedLines={s.selectedLines}
        preparing={s.preparing}
        emptyHint={s.orderEmptyHint}
        onSetCopies={s.setCopiesFor}
        onExpireDateChange={s.setExpireDateFor}
        onLotNoChange={s.setLotNoFor}
        onRemoveLine={s.removeLine}
        onClearAll={s.clearSelectedLines}
        onPrepare={s.handlePrepare}
      />

      <PrintStickerPreparedCard
        preparedRows={s.preparedRows}
        selectedPreparedRowIds={s.selectedPreparedRowIds}
        onSelectedPreparedRowIdsChange={s.setSelectedPreparedRowIds}
        deletingPrepared={s.deletingPrepared}
        printing={s.printing}
        preparing={s.preparing}
        onDeletePrepared={s.handleDeletePrepared}
        onPrint={s.handlePrint}
      />
    </div>
  );
}
