export type SelectedLine = {
  itemcode: string;
  itemname: string;
  copies: number | null;
  stockId?: string;
  refillCap: number;
  expireDate: string;
  lotNo?: string;
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
};
