export type SelectedLine = {
  itemcode: string;
  itemname: string;
  copies: number | null;
  /** stock_id ของตู้ (เช่น 1,2,3) */
  stockId?: string;
  /** backward compatible for staff page (legacy flow) */
  departmentId?: string;
  /** backward compatible for staff page (legacy flow) */
  cabinetId?: string;
  /** เพดานจำนวนแผ่นต่อรายการ (อัปเดตหลังเลือกตู้ + ดึง refill หรือค่าเริ่มต้น 10) */
  refillCap: number;
  /** วันหมดอายุ YYYY-MM-DD (ค.ศ.) ตรงกับ DatePickerBE / dispense — ว่างได้ */
  expireDate: string;
  /** Lot No — ว่างได้ (ระบบใช้รหัสชุด P-xxx เหมือนเดิม) */
  lotNo?: string;
  /** แสดงหน่วย `หลัก (N หน่วยการเบิก)` — copies × SubUnitQty */
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
};
