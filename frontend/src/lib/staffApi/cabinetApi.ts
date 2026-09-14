import staffApi from './index';
import { createCabinetListGetAll, createCabinetUsersApi } from '@/lib/cabinet-http-clients';
import type { ApiResponse } from '@/types/common';

export type StaffCabinetTempHumLogPoint = {
  id: number;
  create_date: string;
  temp_log: number;
  hum_log: number;
};

export type StaffCabinetTempHumCabinet = {
  log_cabinet_id: number;
  app_cabinet_id: number | null;
  cabinet_name: string | null;
  cabinet_code: string | null;
  last_log_at: string | null;
  latest_temp: number | null;
  latest_hum: number | null;
  log_count: number;
  logs: StaffCabinetTempHumLogPoint[];
};

export type StaffCabinetTempHumChartData = {
  cabinets: StaffCabinetTempHumCabinet[];
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
  points: StaffCabinetTempHumLogPoint[];
  range: {
    hours: number | null;
    year: number | null;
    month: number | null;
    from: string;
    to: string;
    used_fallback: boolean;
  };
};

export type StaffCabinetTempHumOverviewData = {
  cabinets: StaffCabinetTempHumCabinet[];
  range: {
    hours: number | null;
    year: number | null;
    month: number | null;
    from: string;
    to: string;
  };
};

export const staffCabinetTempHumApi = {
  getOverview: async (params?: {
    year?: number;
    month?: number;
  }): Promise<ApiResponse<StaffCabinetTempHumOverviewData>> => {
    const response = await staffApi.get('/cabinet/temp-hum-logs/overview', { params });
    return response.data;
  },

  getChart: async (params?: {
    cabinet_id?: number;
    hours?: number;
    year?: number;
    month?: number;
    limit?: number;
  }): Promise<ApiResponse<StaffCabinetTempHumChartData>> => {
    const response = await staffApi.get('/cabinet/temp-hum-logs/chart', { params });
    return response.data;
  },
};

/** ผู้ใช้ในตู้ — โค้ดเดียวกับ admin / `cabinet-http-clients` เปลี่ยนแค่ axios instance → staffApi */
export const staffCabinetUsersApi = createCabinetUsersApi(staffApi);

/** GET /cabinets — โค้ดเดียวกับ factory ใน cabinet-http-clients */
export const staffCabinetApi = createCabinetListGetAll(staffApi);

// =========================== Cabinet Department Mapping API ===========================
export const staffCabinetDepartmentApi = {
  getAll: async (params?: { cabinetId?: number; departmentId?: number; status?: string; keyword?: string }): Promise<ApiResponse<any[]>> => {
    // แปลง camelCase -> snake_case ให้ตรงกับ backend
    const apiParams: Record<string, unknown> = {};
    if (params?.cabinetId !== undefined) apiParams.cabinet_id = params.cabinetId;
    if (params?.departmentId !== undefined) apiParams.department_id = params.departmentId;
    if (params?.status !== undefined) apiParams.status = params.status;
    if (params?.keyword !== undefined && params.keyword !== "") apiParams.keyword = params.keyword;

    const response = await staffApi.get('/cabinet-departments', { params: apiParams });
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.post('/cabinet-departments', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await staffApi.put(`/cabinet-departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await staffApi.delete(`/cabinet-departments/${id}`);
    return response.data;
  },

  getItemStocksByCabinet: async (cabinetId: number, params?: { page?: number; limit?: number; keyword?: string }): Promise<ApiResponse<any>> => {
    const response = await staffApi.get('/item-stocks/in-cabinet', {
      params: { ...params, cabinet_id: cabinetId }
    });
    return response.data;
  },

  /** รายงานจัดการตู้ Cabinet - แผนก (Excel) — POST /reports/cabinet-departments/excel */
  downloadCabinetDepartmentsExcel: async (params?: { cabinetId?: number; departmentId?: number; status?: string }): Promise<void> => {
    const body = { cabinetId: params?.cabinetId, departmentId: params?.departmentId, status: params?.status };
    const response = await staffApi.post('/reports/cabinet-departments/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `cabinet_departments_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานจัดการตู้ Cabinet - แผนก (PDF) — POST /reports/cabinet-departments/pdf */
  downloadCabinetDepartmentsPdf: async (params?: { cabinetId?: number; departmentId?: number; status?: string }): Promise<void> => {
    const body = { cabinetId: params?.cabinetId, departmentId: params?.departmentId, status: params?.status };
    const response = await staffApi.post('/reports/cabinet-departments/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `cabinet_departments_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};