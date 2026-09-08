// Category Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  slug: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetCategoriesQuery {
  page?: number;
  limit?: number;
  parentId?: string;
}

// Item Types (Updated to match backend schema)
export interface Item {
  // Primary Key
  itemcode: string; // Primary key (changed from id)
  
  // Basic Information
  itemname?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number; // Decimal in DB
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status & Flags
  item_status?: number; // 0 = active, etc.
  IsSet?: string; // '0' or '1'
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  IsCancel?: number;
  IsSingle?: boolean;
  fixcost?: boolean;
  
  // IDs
  itemtypeID?: number;
  /** หน่วย — stock / ธุรกรรม */
  UnitID?: number;
  /** หน่วยการเบิก — แสดงผลเท่านั้น */
  SubUnitID?: number;
  /** เช่น 18 = เม็ดต่อ 1 หน่วย — ไม่ใช้คูณ stock */
  SubUnitQty?: number;
  /** @deprecated ใช้ department_ids (ItemDepartments) แทน */
  DepartmentID?: number;
  /** แผนกที่ใช้ Item นี้ (จาก ItemDepartments) */
  department_ids?: number[];
  /** ชื่อแผนกที่ใช้ Item นี้ (จาก ItemDepartments) */
  department_names?: string[];
  SupllierID?: number;
  warehouseID?: number;
  procedureID?: number;
  
  // Images
  Picture?: string;
  Picture2?: string;
  Picture3?: string;
  Picture4?: string;
  Picture5?: string;
  Picweb?: string;
  
  // Dates
  CreateDate?: string;
  ModiflyDate?: string;
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  InternalCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
  UserCreate?: number;
  UserModify?: number;
  
  // Legacy fields (for backward compatibility)
  category?: Category;

  // Department (from API when included)
  department?: {
    ID?: number;
    DepName?: string;
    DepName2?: string;
  };

  /** จาก Prisma include `unit` (หน่วย) */
  unit?: { ID?: number; UnitName?: string | null };
  /** จาก Prisma include `subUnit` (หน่วยการเบิก) */
  subUnit?: { ID?: number; UnitName?: string | null };

  Alternatename?: string | null;
  /** Min/Max ต่อตู้ (จาก CabinetItemSetting เมื่อกรอง cabinet_id) */
  cabinetItemSetting?: { stock_min?: number | null; stock_max?: number | null } | null;
  // Item stocks (from API when included, e.g. findAllItems)
  itemStocks?: ItemStockRow[];
  count_itemstock?: number;
  /** จำนวนอุปกรณ์ที่ถูกใช้งานในปัจจุบัน (จาก supply_usage_items) */
  qty_in_use?: number;
  /** จำนวนที่แจ้งชำรุด (จาก supply_item_return_records, return_reason=DAMAGED, อ้างอิงตู้/stock_id) */
  damaged_qty?: number;
  /** จำนวนที่ต้องเติม: Max − ในตู้ (เลือกตู้ = ตู้นั้น; ไม่เลือกตู้ = รวมทุกตู้) */
  refill_qty?: number;
  /** เมื่อไม่เลือกตู้และมีตู้เดียวที่ต้องเติม — ชื่อตู้นั้น */
  refill_cabinet_name?: string | null;
  refill_cabinet_count?: number;
  /** สรุปต้องเติมแยกตามตู้ (ใช้ใน expanded subtable) */
  refill_by_cabinet?: ItemRefillByCabinet[];
}

export interface ItemRefillByCabinet {
  cabinet_id: number;
  cabinet_name?: string | null;
  in_cabinet: number;
  stock_min?: number | null;
  stock_max: number;
  refill_qty: number;
}

export interface ItemStockRow {
  RowID?: number;
  StockID?: number;
  Qty?: number;
  RfidCode?: string;
  ExpireDate?: string; // ISO date string
  expDate?: string | Date | null;
  /** true = อยู่ในตู้, false = ถูกเบิก */
  IsStock?: boolean;
  cabinet?: {
    id?: number;
    cabinet_name?: string;
    cabinet_code?: string;
    stock_id?: number;
    cabinetDepartments?: {
      id?: number;
      department_id?: number;
      status?: string;
      department?: {
        ID?: number;
        DepName?: string;
        DepName2?: string;
      };
    }[];
  };
}

export interface CreateItemDto {
  // Required
  itemcode: string; // Primary key, required
  
  // Basic Info
  itemname?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number;
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status
  item_status?: number;
  /** 1 = ปิดการใช้งาน, 0/null = ใช้งาน */
  IsCancel?: number;
  IsSet?: string;
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  
  // IDs
  itemtypeID?: number;
  UnitID?: number;
  SubUnitID?: number;
  SubUnitQty?: number;
  DepartmentID?: number;
  /** แผนกที่ใช้ Item นี้ (เก็บลง ItemDepartments) — สูงสุด 3 แผนก */
  department_ids?: number[];
  SupllierID?: number;
  warehouseID?: number;
  
  // Images
  picture?: File; // For file upload
  Picture?: string; // For existing path
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
}

export interface UpdateItemDto {
  // All fields optional for update
  itemname?: string;
  Barcode?: string;
  Description?: string;
  
  // Pricing
  CostPrice?: number;
  SalePrice?: number;
  UsagePrice?: number;
  
  // Stock
  stock_balance?: number;
  stock_min?: number;
  stock_max?: number;
  Minimum?: number;
  Maximum?: number;
  
  // Status
  item_status?: number;
  /** 1 = ปิดการใช้งาน, 0/null = ใช้งาน */
  IsCancel?: number;
  IsSet?: string;
  IsReuse?: string;
  IsNormal?: string;
  IsSpecial?: string;
  IsStock?: boolean;
  
  // IDs
  itemtypeID?: number;
  UnitID?: number;
  SubUnitID?: number | null;
  SubUnitQty?: number | null;
  DepartmentID?: number;
  /** แผนกที่ใช้ Item นี้ (เก็บลง ItemDepartments) — สูงสุด 3 แผนก */
  department_ids?: number[];
  SupllierID?: number;
  warehouseID?: number;
  
  // Images
  picture?: File;
  Picture?: string;
  
  // Other
  weight?: number;
  Note?: string;
  RefNo?: string;
  SapCode?: string;
  ManufacturerName?: string;
  SuplierName?: string;
}

/** ผลลัพธ์การอัปโหลด Item Master จากไฟล์ Excel */
export interface ItemMasterUploadRowError {
  row: number;
  itemcode?: string;
  message: string;
}

export interface ItemMasterUploadResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: ItemMasterUploadRowError[];
}

export interface GetItemsQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  item_status?: number;
  itemtypeID?: number;
  warehouseID?: number;
  /** Division (แผนกหลัก) */
  department_id?: number;
  cabinet_id?: number;
  status?: string;
  /** กรองชิปสถานะหน้า items-stock (all | expired | soon | low) */
  stock_status?: string;
  expire_from?: string;
  expire_to?: string;
  sort_by?: 'itemname' | 'itemcode' | 'CostPrice' | 'stock_balance' | 'CreateDate';
  sort_order?: 'asc' | 'desc';
}

