import staffApi from './index';

export const staffStickerPrintApi = {
  printLabelItems: async (body: {
    items: Array<{ itemcode: string; copies: number }>;
    department_id?: number;
    cabinet_id?: number;
  }): Promise<{
    success?: boolean;
    message: string;
    lineCount: number;
    count: number;
    totalBytesSent: number;
    host: string;
    port: number;
    template: string;
    printedAt: string;
  }> => {
    const response = await staffApi.post('/sticker-print/printLabel-items', body);
    return response.data;
  },

  listHistory: async (params?: {
    itemcode?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    printed_by_user_id?: number;
    source?: string;
    status?: 'SUCCESS' | 'ERROR';
    department_id?: number;
    cabinet_id?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await staffApi.get('/sticker-print/history', { params });
    return response.data;
  },

  getHistory: async (id: number) => {
    const response = await staffApi.get(`/sticker-print/history/${id}`);
    return response.data;
  },
};
