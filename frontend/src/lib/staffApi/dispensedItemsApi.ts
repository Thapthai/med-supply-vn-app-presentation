import staffApi from './index';
import type { ApiResponse } from '@/types/common';

export const DispensedItemsApi = {
  getDispensedItems: async (query?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<ApiResponse<unknown> & {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }> => {
    const response = await staffApi.get('/medical-supply/dispensed-items', { params: query });
    return response.data;
  },

  getDispensedItemsFromSlots: async (query?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<ApiResponse<unknown> & {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }> => {
    const response = await staffApi.get('/medical-supply/dispensed-items-from-slots', { params: query });
    return response.data;
  },

  /** ดาวน์โหลดรายงานเบิกจากตู้ (Excel) — Backend POST /reports/dispensed-items/excel returns JSON { success, data: { buffer (base64), filename, contentType } } */
  downloadDispensedItemsExcel: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
      subDepartmentId: params?.subDepartmentId,
    };
    const response = await staffApi.post('/reports/dispensed-items/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `dispensed_items_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** ดาวน์โหลดรายงานเบิกจากตู้ (PDF) — Backend POST /reports/dispensed-items/pdf returns JSON { success, data: { buffer (base64), filename, contentType } } */
  downloadDispensedItemsPdf: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
      subDepartmentId: params?.subDepartmentId,
    };
    const response = await staffApi.post('/reports/dispensed-items/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as { error?: string })?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `dispensed_items_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
