import type { ApiResponse, PaginatedResponse } from '@/types/common';

export type CabinetUsersApiClient = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    /** `department.ID` (แผนก) */
    department_id?: number;
    /** `app_cabinets.id` — ตรงกับ backend / ค่าใน SearchableSelect ตู้ */
    cabinet_id?: number;
  }) => Promise<PaginatedResponse<unknown>>;
  getById: (id: number) => Promise<ApiResponse<unknown>>;
  create: (body: {
    user_name: string;
    emp_code?: string | null;
    password?: string;
    cabinet_ids?: number[];
  }) => Promise<ApiResponse<unknown>>;
  update: (id: number, body: { cabinet_ids?: number[] }) => Promise<ApiResponse<unknown>>;
};

export type CabinetListApiClient = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    sort_by?: string;
    sort_order?: string;
  }) => Promise<PaginatedResponse<unknown>>;
};

export interface LinkedCabinetLink {
  user_cabinet_id: number;
  user_id?: number;
  /** เท่ากับ app_cabinets.stock_id (ฟิลด์ Prisma: cabinet_id) */
  cabinet_id: number;
  cabinet: {
    id: number;
    cabinet_name?: string | null;
    cabinet_code?: string | null;
    stock_id?: number | null;
  } | null;
}

export interface CabinetUserRow {
  id: number;
  userName?: string | null;
  empCode?: string | null;
  employee_display?: string | null;
  employee?: {
    empCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  cabinet_count?: number;
  linked_cabinets?: LinkedCabinetLink[];
}
