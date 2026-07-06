import type { Dispatch, SetStateAction } from 'react';
import type { Item } from '@/types/item';
import type { SelectedLine } from '@/app/admin/management/print-sticker/types';

export type { SelectedLine };

export type PrintMode = 'auto' | 'manual';

export type PreparedStockRow = {
  RowID: number;
  ItemCode?: string | null;
  RfidCode?: string | null;
};

export type CabinetDepartmentMapping = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
};

export type DepartmentOpt = { ID: number; DepName?: string; DepName2?: string };

export type CabinetOpt = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
};

export type SelectOption = {
  value: string;
  label: string;
  subLabel?: string;
};

export type PrintStickerTabState = {
  mode: PrintMode;
  setMode: (mode: PrintMode) => void;
  departmentId: string;
  setDepartmentId: (id: string) => void;
  cabinetId: string;
  setCabinetId: (id: string) => void;
  cabinetStockId: number | null;
  loadingDepartments: boolean;
  loadingCabinets: boolean;
  loadDepartments: (keyword?: string) => void;
  resolveCabinets: (departmentIdStr: string, keyword?: string) => void;
  departmentSelectOptions: SelectOption[];
  cabOptions: SelectOption[];
  manualFilterIncomplete: boolean;
  reloadDisabled: boolean;
  reloadButtonLabel: string;
  fetchCabinetItems: () => void;
  loadingList: boolean;
  displayItems: Item[];
  listTotal: number;
  listTotalPages: number;
  page: number;
  hidePagination: boolean;
  keywordInput: string;
  setKeywordInput: (v: string) => void;
  handleSearch: () => void;
  handlePageChange: (page: number) => void;
  selectedItemcodes: Set<string>;
  toggleRow: (row: Item) => void;
  selectAllOnPage: () => void;
  clearSelectionOnPage: () => void;
  cabinetPairSelected: boolean;
  selectedLines: SelectedLine[];
  preparing: boolean;
  setCopiesFor: (itemcode: string, raw: number) => void;
  setExpireDateFor: (itemcode: string, ymd: string) => void;
  setLotNoFor: (itemcode: string, lotNo: string) => void;
  removeLine: (itemcode: string) => void;
  clearSelectedLines: () => void;
  handlePrepare: () => void;
  preparedRows: PreparedStockRow[];
  selectedPreparedRowIds: number[];
  setSelectedPreparedRowIds: Dispatch<SetStateAction<number[]>>;
  deletingPrepared: boolean;
  printing: boolean;
  handleDeletePrepared: () => void;
  handlePrint: () => void;
  orderEmptyHint: string;
};
