import { fetchStaffMeDepartments } from '@/lib/staffApi/staffMeApi';

export type StaffMeDepartmentRow = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
};

type MeScopeCache = {
  staffUserId: number;
  unrestricted: boolean;
  allowedIds: number[] | null;
  departments: StaffMeDepartmentRow[];
};

let meScopeCache: MeScopeCache | null = null;

export function clearStaffDepartmentScopeCache(): void {
  meScopeCache = null;
}

function staffUserIdFromStorage(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: number; staff_user_id?: number; user_id?: number };
    const n = u.id ?? u.staff_user_id ?? u.user_id;
    if (n != null && Number.isFinite(Number(n))) return Number(n);
  } catch {
    return null;
  }
  return null;
}

async function ensureMeScopeLoaded(): Promise<MeScopeCache | null> {
  const storageUserId = staffUserIdFromStorage();

  if (meScopeCache) {
    if (storageUserId != null && meScopeCache.staffUserId !== storageUserId) {
      meScopeCache = null;
    } else {
      return meScopeCache;
    }
  }

  try {
    const res = await fetchStaffMeDepartments();
    if (!res?.success || !res.data) return null;

    const serverUserId = res.data.staff_user_id;
    if (serverUserId == null || !Number.isFinite(Number(serverUserId))) return null;

    const unrestricted = res.data.unrestricted === true;
    const departments = res.data.departments ?? [];
    const allowedIds = unrestricted
      ? null
      : [...new Set(departments.map((d) => d.ID).filter((n) => Number.isFinite(n) && n > 0))].sort(
          (a, b) => a - b,
        );

    meScopeCache = {
      staffUserId: Number(serverUserId),
      unrestricted,
      allowedIds,
      departments,
    };
    return meScopeCache;
  } catch {
    return null;
  }
}

/**
 * null = ไม่จำกัดแผนก
 * number[] = เฉพาะ ID เหล่านี้ (จาก StaffPermissionDepartment ต่อผู้ใช้)
 * undefined = ยังไม่รู้ / ไม่มี session / เรียก API ไม่สำเร็จ
 */
export async function getStaffAllowedDepartmentIds(): Promise<number[] | null | undefined> {
  const c = await ensureMeScopeLoaded();
  if (c == null) return undefined;
  if (c.unrestricted) return null;
  return c.allowedIds != null && c.allowedIds.length > 0 ? c.allowedIds : [];
}

/**
 * รายการแผนกจาก GET /staff/me/departments (user → StaffPermissionDepartment)
 */
export async function getStaffRestrictedDepartmentsFromMe(): Promise<StaffMeDepartmentRow[] | null> {
  const c = await ensureMeScopeLoaded();
  if (c == null) return null;
  if (c.departments.length > 0) return c.departments;
  return null;
}

/**
 * รายการ แผนก สำหรับ dropdown/filter ทุกหน้า Staff
 * อิงจาก GET /staff/me/departments เท่านั้น (user → app_staff_permission_departments)
 * ไม่ดึง GET /departments ทั้งโรงพยาบาล
 */
export async function fetchStaffDepartmentsForFilter(opts?: {
  keyword?: string;
  page?: number;
  limit?: number;
  allowedDepartmentIds?: number[] | null | undefined;
  /** เฉพาะแผนกที่มีตู้ Cabinet ผูก ACTIVE */
  withCabinet?: boolean;
}): Promise<StaffMeDepartmentRow[]> {
  const rawKw = opts?.keyword?.trim() ?? '';
  const kwLower = rawKw.toLowerCase();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 50));
  const page = opts?.page ?? 1;
  const skip = (page - 1) * limit;

  const res = await fetchStaffMeDepartments({ withCabinet: opts?.withCabinet });
  if (!res?.success || !res.data) {
    return [];
  }

  let list = (res.data.departments ?? []) as StaffMeDepartmentRow[];

  if (rawKw) {
    list = list.filter(
      (d) =>
        (d.DepName ?? '').toLowerCase().includes(kwLower) ||
        (d.DepName2 ?? '').toLowerCase().includes(kwLower) ||
        String(d.ID).includes(rawKw),
    );
  }

  if (opts?.allowedDepartmentIds !== undefined && opts.allowedDepartmentIds !== null) {
    list = applyDepartmentScopeToList(list, opts.allowedDepartmentIds);
  }

  return list.slice(skip, skip + limit);
}

/** undefined = ยังไม่รู้ขอบเขต (ห้ามถือว่าไม่จำกัด — ไม่แสดงรายการจนกว่าจะโหลดเสร็จ) */
export function applyDepartmentScopeToList<T extends { ID: number }>(
  list: T[],
  allowed: number[] | null | undefined,
): T[] {
  if (allowed === undefined) return [];
  if (allowed === null) return list;
  if (allowed.length === 0) return [];
  const set = new Set(allowed);
  return list.filter((d) => set.has(d.ID));
}

export function clampDepartmentIdString(
  selected: string | undefined | null,
  allowed: number[] | null | undefined,
  fallbackWhenUnrestricted: string,
): string {
  if (allowed === undefined) {
    return selected != null && selected !== '' ? String(selected) : '';
  }
  if (allowed === null) {
    return selected != null && selected !== '' ? String(selected) : fallbackWhenUnrestricted;
  }
  if (allowed.length === 0) return '';
  const s = selected != null && String(selected).trim() !== '' ? String(selected).trim() : '';
  if (s === '') return '';
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && allowed.includes(n)) return String(n);
  return '';
}
