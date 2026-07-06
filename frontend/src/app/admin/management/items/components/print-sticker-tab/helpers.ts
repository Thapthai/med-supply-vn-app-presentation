import type { Item } from '@/types/item';
import { MAX_TOTAL_LABELS } from '@/app/admin/management/print-sticker/constants';
import type { CabinetDepartmentMapping, CabinetOpt } from './types';

export function mapCabinetFromMapping(
  cabinet: CabinetDepartmentMapping['cabinet'],
): CabinetOpt | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

export function manualRefillCap(_row: Item): number {
  return MAX_TOTAL_LABELS;
}
