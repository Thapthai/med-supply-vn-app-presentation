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
  /** แผนกที่ยืม — จาก itemslotincabinet_detail (IsBorrow) หรือ itemstock เมื่อเป็นยืม */
  borrowDepartmentName?: string | null;
  /** true เมื่อยืม (slot IsBorrow หรือ itemstock.IsBorrow) */
  isBorrow?: boolean;
  /** แสดงเป็นหมายเหตุ เช่น "ยืม" */
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
}

export interface SummaryData {
  total: number;
  totalQty: number;
}
