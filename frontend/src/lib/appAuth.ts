/**
 * หลายโปรเจกต์อยู่โดเมนเดียวกัน → localStorage แชร์กัน
 * เก็บ appname ใน staff_user แล้วเทียบกับค่าจาก NEXTAUTH_URL
 * ถ้าไม่ตรง = ของโปรเจกต์อื่น → ล้างแล้วบังคับ login ใหม่
 */

/** ชื่อแอปจาก NEXTAUTH_URL path เช่น .../smart-cabinet-presentation → smart-cabinet-presentation */
export function getAppName(): string {
  const nextAuthUrl = (process.env.NEXTAUTH_URL || '').trim().replace(/\/$/, '');
  if (nextAuthUrl) {
    try {
      const withProtocol = nextAuthUrl.includes('://') ? nextAuthUrl : `https://${nextAuthUrl}`;
      const u = new URL(withProtocol);
      const path = u.pathname.replace(/^\/+|\/+$/g, '');
      if (path) return path;
      return u.host;
    } catch {
      const parts = nextAuthUrl.split('/').filter(Boolean);
      return parts[parts.length - 1] || nextAuthUrl;
    }
  }
  return (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\/+|\/+$/g, '') || 'smart-cabinet-presentation';
}

export function clearStaffLocalAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('staff_token');
  localStorage.removeItem('staff_user');
}

export function withAppName<T extends Record<string, unknown>>(user: T): T & { appname: string } {
  return { ...user, appname: getAppName() };
}

/** อ่าน staff_user เฉพาะเมื่อ appname ตรงกับแอปนี้ — ไม่ตรงจะล้าง storage */
export function getStaffUserIfSameApp<T extends Record<string, unknown> = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('staff_user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as T & { appname?: string };
    if (user.appname !== getAppName()) {
      clearStaffLocalAuth();
      return null;
    }
    return user;
  } catch {
    clearStaffLocalAuth();
    return null;
  }
}

/** มี token + staff_user ของแอปนี้หรือไม่ */
export function hasStaffAuthForThisApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (!getStaffUserIfSameApp()) return false;
  return !!localStorage.getItem('staff_token');
}

export function saveStaffUser(user: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('staff_user', JSON.stringify(withAppName(user)));
}
