import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

function downloadBase64File(
  res: { buffer?: string; filename?: string; contentType?: string },
  fallbackName: string,
  fallbackType: string,
): void {
  if (!res.buffer) throw new Error('ไม่สามารถสร้างไฟล์ได้');
  const binary = atob(res.buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: res.contentType || fallbackType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', res.filename || fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export type DepartmentDispenseItem = {
  itemcode: string;
  itemname?: string | null;
  store?: string | null;
};

export type DepartmentDispenseLocation = {
  location_id: number;
  itemcode: string;
  itemname?: string | null;
  location_row: string | null;
  location_rack: string | null;
  location_shelf: string | null;
  qty: number;
  store_ref: string | null;
  location_source?: 'item_storage';
  stock_id: number | null;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  max_qty?: number | null;
};

export type DepartmentDispenseLine = {
  id: number;
  line_order: number;
  itemcode: string;
  item_name?: string | null;
  qty: number;
  location_row?: string | null;
  location_rack?: string | null;
  location_shelf?: string | null;
  store_ref?: string | null;
  slot_no?: number | null;
  sensor?: number | null;
};

export type DepartmentDispenseDocument = {
  id: number;
  doc_no: string;
  department_id: number;
  status: string;
  remark?: string | null;
  created_at: string;
  department?: {
    ID: number;
    DepName?: string | null;
    DepName2?: string | null;
    RefDepID?: string | null;
  };
  lines?: DepartmentDispenseLine[];
  _count?: { lines: number };
  createdBy?: { id: number; fname: string; lname: string; email: string };
};

export const departmentDispenseApi = {
  listDepartmentItems: async (
    departmentId: number,
    keyword?: string,
  ): Promise<
    ApiResponse<{
      department: { ID: number; DepName?: string | null; DepName2?: string | null; RefDepID?: string | null };
      items: DepartmentDispenseItem[];
    }>
  > => {
    const response = await api.get('/department-dispense/department-items', {
      params: { department_id: departmentId, keyword: keyword || undefined },
    });
    return response.data;
  },

  resolveItemLocations: async (
    itemcodes: string[],
    departmentId: number,
  ): Promise<
    ApiResponse<DepartmentDispenseLocation[]> & { missing_itemcodes?: string[] }
  > => {
    const response = await api.post('/department-dispense/item-locations', {
      itemcodes,
      department_id: departmentId,
    });
    return response.data;
  },

  createDocument: async (body: {
    department_id: number;
    remark?: string;
    lines: Array<{
      itemcode: string;
      qty: number;
      location_id?: number;
      location_row?: string | null;
      location_rack?: string | null;
      location_shelf?: string | null;
    }>;
  }): Promise<ApiResponse<DepartmentDispenseDocument>> => {
    const response = await api.post('/department-dispense/documents', body);
    return response.data;
  },

  listDocuments: async (params?: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
  }): Promise<{
    success: boolean;
    data: DepartmentDispenseDocument[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  }> => {
    const response = await api.get('/department-dispense/documents', { params });
    return response.data;
  },

  getDocument: async (id: number): Promise<ApiResponse<DepartmentDispenseDocument>> => {
    const response = await api.get(`/department-dispense/documents/${id}`);
    return response.data;
  },

  downloadDocumentsExcel: async (params?: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
  }): Promise<void> => {
    const response = await api.post('/department-dispense/documents/export/excel', params ?? {});
    const res = response.data as {
      success?: boolean;
      data?: { buffer?: string; filename?: string; contentType?: string };
      error?: string;
    };
    if (!res?.success || !res?.data?.buffer) {
      throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ Excel ได้');
    }
    downloadBase64File(
      res.data,
      `department_dispense_documents_${new Date().toISOString().split('T')[0]}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  },

  downloadDocumentsPdf: async (params?: {
    page?: number;
    limit?: number;
    department_id?: number;
    keyword?: string;
  }): Promise<void> => {
    const response = await api.post('/department-dispense/documents/export/pdf', params ?? {});
    const res = response.data as {
      success?: boolean;
      data?: { buffer?: string; filename?: string; contentType?: string };
      error?: string;
    };
    if (!res?.success || !res?.data?.buffer) {
      throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ PDF ได้');
    }
    downloadBase64File(
      res.data,
      `department_dispense_documents_${new Date().toISOString().split('T')[0]}.pdf`,
      'application/pdf',
    );
  },

  downloadDocumentPdf: async (id: number): Promise<void> => {
    const response = await api.post(`/department-dispense/documents/${id}/export/pdf`);
    const res = response.data as {
      success?: boolean;
      data?: { buffer?: string; filename?: string; contentType?: string };
      error?: string;
    };
    if (!res?.success || !res?.data?.buffer) {
      throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ PDF ได้');
    }
    downloadBase64File(
      res.data,
      `department_dispense_document_${id}.pdf`,
      'application/pdf',
    );
  },
};
