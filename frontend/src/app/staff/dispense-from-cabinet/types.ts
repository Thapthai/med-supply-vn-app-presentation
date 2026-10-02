export interface DispensedItem {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  itemType: string;
  itemCategory: string;
  itemtypeID: number;
  RfidCode: string;
  StockID: number;
  Istatus_rfid?: number;
  CabinetUserID?: number;
  /** HN ผู้ป่วยจาก itemslotincabinet_detail.HnCode */
  hn?: string | null;
  HnCode?: string | null;
  cabinetUserName?: string;
  cabinetName?: string;
  departmentName?: string;
  UnitID?: number;
  SubUnitID?: number;
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
  borrowDepartmentName?: string | null;
  isBorrow?: boolean;
  borrowRemark?: string | null;
}

export interface FilterState {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  itemTypeFilter: string;
  departmentId: string;
  subDepartmentId: string;
  cabinetId: string;
  departmentCode?: string;
  cabinetCode?: string;
}

export interface SummaryData {
  total: number;
  totalQty: number;
}
