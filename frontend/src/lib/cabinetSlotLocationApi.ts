import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

export type ItemStorageLocationRow = {
  itemcode: string;
  itemname?: string | null;
  stock_id: number;
  stock_max?: number | null;
  location_id?: number | null;
  location_row?: string | null;
  location_rack?: string | null;
  location_shelf?: string | null;
};

export type ItemStorageLocationMappingLine = {
  stock_id: number;
  itemcode: string;
  location_row?: string | null;
  location_rack?: string | null;
  location_shelf?: string | null;
};

/** @deprecated use ItemStorageLocationRow */
export type CabinetSlotLocationItem = ItemStorageLocationRow;

/** @deprecated use ItemStorageLocationMappingLine */
export type CabinetSlotLocationMappingLine = ItemStorageLocationMappingLine & {
  slot_no?: number;
  sensor?: number;
};

export const cabinetSlotLocationApi = {
  listCabinetItems: async (
    cabinetId: number,
    params?: { keyword?: string; page?: number; limit?: number },
  ): Promise<
    ApiResponse<{
      cabinet: {
        id: number;
        stock_id: number;
        cabinet_name?: string | null;
        cabinet_code?: string | null;
      };
      items: ItemStorageLocationRow[];
      total: number;
      page: number;
      limit: number;
      lastPage: number;
    }>
  > => {
    const response = await api.get('/cabinet-slot-locations/cabinet-items', {
      params: {
        cabinet_id: cabinetId,
        keyword: params?.keyword || undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  bulkUpsert: async (body: {
    locations: ItemStorageLocationMappingLine[];
  }): Promise<ApiResponse<unknown> & { count?: number }> => {
    const response = await api.post('/cabinet-slot-locations/bulk', body);
    return response.data;
  },
};
