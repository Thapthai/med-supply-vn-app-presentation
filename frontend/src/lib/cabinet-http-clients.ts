import type { AxiosInstance } from 'axios';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

/**
 * Client สำหรับโมดูลตู้ — นิยามเส้นทางที่เดียว (คู่กับ admin `lib/api.ts`)
 * Staff portal ใช้ factory กับ `staffApi` เท่านั้น ไม่มี logic แยกที่ staffApi/cabinetApi
 */
export function createCabinetUsersApi(http: AxiosInstance) {
  return {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      keyword?: string;
      /** Division = department.ID */
      department_id?: number;
      /** ตู้ = app_cabinets.id (backend แปลงไป stock_id ให้) */
      cabinet_id?: number;
    }): Promise<PaginatedResponse<any>> => {
      const response = await http.get('/cabinet/users', { params });
      return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<any>> => {
      const response = await http.get(`/cabinet/users/${id}`);
      return response.data;
    },

    create: async (body: {
      user_name: string;
      emp_code?: string | null;
      password?: string;
      cabinet_ids?: number[];
    }): Promise<ApiResponse<any>> => {
      const response = await http.post('/cabinet/users', body);
      return response.data;
    },

    update: async (
      id: number,
      body: {
        cabinet_ids?: number[];
      },
    ): Promise<ApiResponse<any>> => {
      const response = await http.put(`/cabinet/users/${id}`, body);
      return response.data;
    },
  };
}

/** รายการตู้ GET /cabinets — ใช้กับ Workspace ที่ต้องการแค่โหลดรายการตู้ */
export function createCabinetListGetAll(http: AxiosInstance) {
  return {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      keyword?: string;
      sort_by?: string;
      sort_order?: string;
      department_id?: number;
    }): Promise<PaginatedResponse<any>> => {
      const response = await http.get('/cabinets', { params });
      return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<any>> => {
      const response = await http.get(`/cabinets/${id}`);
      return response.data;
    },
  };
}

export type CabinetTempHumChartPoint = {
  id: number;
  create_date: string;
  temp_log: number;
  hum_log: number;
};

export type CabinetTempHumChartCabinet = {
  log_cabinet_id: number;
  app_cabinet_id: number | null;
  cabinet_name: string | null;
  cabinet_code: string | null;
  last_log_at: string | null;
  latest_temp: number | null;
  latest_hum: number | null;
  log_count: number;
  logs: CabinetTempHumChartPoint[];
};

export type CabinetTempHumChartData = {
  cabinets: CabinetTempHumChartCabinet[];
  selected: {
    log_cabinet_id: number;
    app_cabinet_id: number | null;
    cabinet_name: string | null;
    cabinet_code: string | null;
  } | null;
  latest: { create_date: string; temp_log: number; hum_log: number } | null;
  stats: {
    min_temp: number;
    max_temp: number;
    avg_temp: number;
    min_hum: number;
    max_hum: number;
    delta_temp: number;
  } | null;
  points: CabinetTempHumChartPoint[];
  range: {
    hours: number | null;
    year: number | null;
    month: number | null;
    from: string;
    to: string;
    used_fallback: boolean;
  };
};

export type CabinetTempHumOverviewData = {
  cabinets: CabinetTempHumChartCabinet[];
  range: {
    hours: number | null;
    year: number | null;
    month: number | null;
    from: string;
    to: string;
  };
};

export function createCabinetTempHumApi(http: AxiosInstance) {
  return {
    getOverview: async (params?: {
      year?: number;
      month?: number;
    }): Promise<ApiResponse<CabinetTempHumOverviewData>> => {
      const response = await http.get('/cabinet/temp-hum-logs/overview', { params });
      return response.data;
    },

    getChart: async (params?: {
      cabinet_id?: number;
      hours?: number;
      year?: number;
      month?: number;
      limit?: number;
    }): Promise<ApiResponse<CabinetTempHumChartData>> => {
      const response = await http.get('/cabinet/temp-hum-logs/chart', { params });
      return response.data;
    },
  };
}
