import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

export type ItemStorageLocationRow = {
  itemcode: string;
  itemname?: string | null;
  stock_max?: number | null;
  mapped_count?: number;
  location_id?: number | null;
  location_row?: string | null;
  location_rack?: string | null;
  location_shelf?: string | null;
  qty?: number | null;
  updated_at?: string | null;
};

export type ItemStorageLocationMappingLine = {
  itemcode: string;
  location_row?: string | null;
  location_rack?: string | null;
  location_shelf?: string | null;
  qty?: number | null;
};

export type ItemStorageLocationListResult = {
  items: ItemStorageLocationRow[];
  total: number;
  page: number;
  limit: number;
  lastPage: number;
};

/** @deprecated use ItemStorageLocationRow */
export type CabinetSlotLocationItem = ItemStorageLocationRow;

/** @deprecated use ItemStorageLocationMappingLine */
export type CabinetSlotLocationMappingLine = ItemStorageLocationMappingLine & {
  slot_no?: number;
  sensor?: number;
};

export const cabinetSlotLocationApi = {
  listItems: async (params?: {
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ItemStorageLocationListResult>> => {
    const response = await api.get('/cabinet-slot-locations/items', {
      params: {
        keyword: params?.keyword || undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  listMapped: async (params?: {
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ItemStorageLocationListResult>> => {
    const response = await api.get('/cabinet-slot-locations/mapped', {
      params: {
        keyword: params?.keyword || undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  /** @deprecated use listItems */
  listCabinetItems: async (
    _cabinetId: number,
    params?: { keyword?: string; page?: number; limit?: number },
  ) => cabinetSlotLocationApi.listItems(params),

  bulkUpsert: async (body: {
    locations: ItemStorageLocationMappingLine[];
  }): Promise<ApiResponse<unknown> & { count?: number }> => {
    const response = await api.post('/cabinet-slot-locations/bulk', body);
    return response.data;
  },
};
