import staffApi from './index';
import type { DailyCabinetStockArchiveRow } from '@/lib/api';

/** Backend ส่ง { success, data: { buffer (base64), filename, contentType } } */
type NestedFileResponse = {
  success?: boolean;
  data?: { buffer?: string; filename?: string; contentType?: string };
  error?: string;
};

function nestedDataToBlob(res: NestedFileResponse): Blob {
  if (!res?.success || !res?.data?.buffer) throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ได้');
  const binary = atob(res.data.buffer);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: res.data.contentType || 'application/octet-stream' });
}

function triggerNestedDownload(res: NestedFileResponse, fallbackFilename: string): void {
  if (!res?.success || !res?.data?.buffer) throw new Error(res?.error || 'ไม่สามารถสร้างไฟล์ได้');
  const blob = nestedDataToBlob(res);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', res.data!.filename || fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const staffReportApi = {
  exportComparisonExcel: async (usageId: number): Promise<Blob> => {
    const response = await staffApi.post('/reports/comparison/excel', { usageId });
    return nestedDataToBlob(response.data);
  },

  exportComparisonPDF: async (usageId: number): Promise<Blob> => {
    const response = await staffApi.post('/reports/comparison/pdf', { usageId });
    return nestedDataToBlob(response.data);
  },

  exportEquipmentUsageExcel: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<Blob> => {
    const response = await staffApi.post('/reports/equipment-usage/excel', {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      hospital: params?.hospital,
      department: params?.department,
      usageIds: params?.usageIds,
    });
    return nestedDataToBlob(response.data);
  },

  exportEquipmentUsagePDF: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<Blob> => {
    const response = await staffApi.post('/reports/equipment-usage/pdf', {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      hospital: params?.hospital,
      department: params?.department,
      usageIds: params?.usageIds,
    });
    return nestedDataToBlob(response.data);
  },

  exportEquipmentDisbursementExcel: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<Blob> => {
    const response = await staffApi.post('/reports/equipment-disbursement/excel', {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      hospital: params?.hospital,
      department: params?.department,
    });
    return nestedDataToBlob(response.data);
  },

  exportEquipmentDisbursementPDF: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<Blob> => {
    const response = await staffApi.post('/reports/equipment-disbursement/pdf', {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      hospital: params?.hospital,
      department: params?.department,
    });
    return nestedDataToBlob(response.data);
  },

  downloadCabinetStockExcel: async (params?: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    asOfDate?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-stock/excel', {
      cabinetId: params?.cabinetId,
      cabinetCode: params?.cabinetCode,
      departmentId: params?.departmentId,
      asOfDate: params?.asOfDate,
    });
    triggerNestedDownload(
      response.data,
      `cabinet_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  },

  downloadCabinetStockPdf: async (params?: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    asOfDate?: string;
  }): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-stock/pdf', {
      cabinetId: params?.cabinetId,
      cabinetCode: params?.cabinetCode,
      departmentId: params?.departmentId,
      asOfDate: params?.asOfDate,
    });
    triggerNestedDownload(
      response.data,
      `cabinet_stock_report_${new Date().toISOString().split('T')[0]}.pdf`,
    );
  },

  listDailyCabinetStockArchives: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<DailyCabinetStockArchiveRow[]> => {
    const response = await staffApi.post('/reports/cabinet-stock/daily-archive/list', params ?? {});
    const res = response.data as {
      success?: boolean;
      data?: DailyCabinetStockArchiveRow[];
      error?: string;
    };
    if (!res?.success) throw new Error(res?.error || 'โหลดรายการไม่สำเร็จ');
    return res.data ?? [];
  },

  downloadDailyCabinetStockArchive: async (id: number): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-stock/daily-archive/download', { id });
    triggerNestedDownload(response.data, `cabinet_stock_archive_${id}`);
  },

  runDailyCabinetStockArchive: async (reportDate?: string): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-stock/daily-archive/run', { reportDate });
    const res = response.data as { success?: boolean; error?: string };
    if (!res?.success) throw new Error(res?.error || 'สำรองรายงานไม่สำเร็จ');
  },

  downloadCabinetTempHumExcel: async (params?: { year?: number; month?: number }): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-temp-hum/excel', {
      year: params?.year,
      month: params?.month,
    });
    triggerNestedDownload(response.data, 'cabinet_temp_hum_report.xlsx');
  },

  downloadCabinetTempHumPdf: async (params?: { year?: number; month?: number }): Promise<void> => {
    const response = await staffApi.post('/reports/cabinet-temp-hum/pdf', {
      year: params?.year,
      month: params?.month,
    });
    triggerNestedDownload(response.data, 'cabinet_temp_hum_report.pdf');
  },
};
