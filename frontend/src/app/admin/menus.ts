import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Box,
  Package,
  History,
  FileBarChart,
  Settings,
  Users,
  Shield,
  Network,
  RotateCcw,
  ClipboardList,
  UserCog,
  Boxes,
  Tags,
  Building2,
  Layers,
  Printer,
  Ruler,
  BookMarked,
  ContactRound,
  IdCard,
} from 'lucide-react';
// Type definitions for menu and submenu
export interface StaffMenuSubItem {
  name: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
  /** ถ้ากำหนด: แสดงเมนูนี้เฉพาะ role ที่ระบุ (คู่กับสิทธิ์จาก API ที่ไม่ถูกปิด) */
  roles?: string[];
  /** เปิด URL ภายนอกแทน `href` — ใช้กับ `target="_blank"` ใน Sidebar */
  externalHref?: string;
}

export interface StaffMenuItem {
  name: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
  submenu?: StaffMenuSubItem[];
  roles?: string[];
  /** เมื่อเป็น true กดแล้วไม่นำทาง แค่เปิด/ปิด submenu */
  noHref?: boolean;
}

// Utility to filter menu and submenu by permissions (+ optional role gate บนเมนูย่อย)
export function filterMenuByPermissions(
  menuItems: StaffMenuItem[],
  permissions: Record<string, boolean>,
  roleCode?: string | null,
  options?: { skipSubRoleGate?: boolean },
): StaffMenuItem[] {
  const r = (roleCode ?? '').toString().trim().toLowerCase();
  const skipGate = options?.skipSubRoleGate === true;

  const subVisible = (sub: StaffMenuSubItem): boolean => {
    if (permissions[sub.href] === false) return false;
    if (sub.roles?.length) {
      if (skipGate) return true;
      return !!r && sub.roles.map((x) => x.toLowerCase()).includes(r);
    }
    return permissions[sub.href] !== false;
  };

  return menuItems
    .map((item) => {
      if (!item.submenu) return item;
      const filteredSubmenu = item.submenu.filter(subVisible);
      return { ...item, submenu: filteredSubmenu };
    })
    .filter((item) => {
      if (item.submenu && item.submenu.length > 0) {
        if (item.noHref) return true;
        return true;
      }
      if (item.submenu) return false;
      if (item.noHref) return false;
      return permissions[item.href] !== false;
    });
}

export const adminMenuItems: StaffMenuItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    description: 'ภาพรวมระบบ',
  },
  {
    name: 'อุปกรณ์',
    href: '/admin/items',
    icon: Box,
    description: 'จัดการอุปกรณ์และสต๊อก',
    noHref: true,
    submenu: [
      {
        name: 'สต๊อกอุปกรณ์ในตู้',
        href: '/admin/items',
        description: 'เมนูสต๊อกอุปกรณ์ที่มีในตู้ SmartCabinet',
        icon: Package,
      },
      {
        name: 'อุปกรณ์ยืม',
        href: '/admin/item-borrow',
        description: 'รายการยืมจาก slot detail + Division จากตู้',
        icon: BookMarked,
      },
      {
        name: 'เบิกอุปกรณ์ให้หน่วยงาน',
        href: '/admin/department-dispense',
        description: 'เลือก Division → รายการเบิก → ตำแหน่ง Row/Rack/Shelf → เอกสารควบคุมการเบิก',
        icon: ClipboardList,
      },
      {
        name: 'เบิกอุปกรณ์จากตู้',
        href: '/admin/dispense-from-cabinet',
        description: 'การเบิกอุปกรณ์จากตู้ SmartCabinet',
        icon: FileBarChart,
      },
      {
        name: 'เติมอุปกรณ์เข้าตู้',
        href: '/admin/return-to-cabinet',
        description: 'การเติมอุปกรณ์เข้าตู้ SmartCabinet',
        icon: FileBarChart,
      },
      {
        name: 'บันทึกใช้อุปกรณ์กับคนไข้',
        href: '/admin/medical-supplies',
        description: 'บันทึกใช้อุปกรณ์กับคนไข้ จากตู้ SmartCabinet',
        icon: History,
      },
      {
        name: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
        href: '/admin/return',
        description: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
        icon: RotateCcw,
      },
      {
        name: 'เปรียบเทียบตามเวชภัณฑ์',
        href: '/admin/item-comparison',
        description: 'เปรียบเทียบการเบิกกับการใช้งานตามเวชภัณฑ์',
        icon: FileBarChart,
      },
    ],
  },
  {
    name: 'ตั้งค่า',
    href: '/admin/management',
    icon: Settings,
    description: 'ตั้งค่าระบบ',
    noHref: true,
    submenu: [
      {
        name: 'จัดการตู้ Cabinet',
        href: '/admin/management/cabinets',
        icon: Package,
        description: 'จัดการตู้ Cabinet',
      },
      {
        name: 'ตำแหน่งจัดเก็บอุปกรณ์',
        href: '/admin/management/storage-locations',
        icon: Layers,
        description: 'บันทึก Row/Rack/Shelf ต่อ Item ใน app_item_storage_locations',
      },
      {
        name: 'จัดการพนักงาน',
        href: '/admin/management/staff-users',
        icon: Users,
        description: 'จัดการ Staff Users และ Client Credentials',
      },
      {
        name: 'จัดการ Staff Role',
        href: '/admin/management/staff-roles',
        icon: UserCog,
        description: 'แก้ไขชื่อ คำอธิบาย สถานะ และลบ Role',
      },
      {
        name: ' กำหนดสิทธิ์ Roles Staff',
        href: '/admin/management/permission-role',
        icon: Shield,
        description: 'จัดการ Roles Staff',
      },
      // {
      //   name: 'จัดการ Division',
      //   href: '/admin/management/departments',
      //   icon: Building2,
      //   description: 'ดู Division หลักและตั้งรหัส Division ย่อยจับคู่ Location คนไข้',
      // },
      // {
      //   name: 'Cabinet - Division',
      //   href: '/admin/management/cabinet-departments',
      //   icon: Network,
      //   description: 'จัดการตู้ Cabinet และเชื่อมโยงกับ Division',
      // },

      {
        name: 'จัดการ อุปกรณ์',
        href: '/admin/management/items',
        icon: Boxes,
        description: 'รายการรหัสเวชภัณฑ์ในฐานข้อมูล',
      },
      // {
      //   name: 'จัดการหน่วยนับ (Unit)',
      //   href: '/admin/management/units',
      //   icon: Ruler,
      //   description: 'หน่วยนับสำหรับผูกกับรายการ Item',
      // },
      // {
      //   name: 'พิมพ์สติ๊กเกอร์',
      //   href: '/admin/management/print-sticker',
      //   icon: Printer,
      //   description: 'พิมพ์สติ๊กเกอร์ผ่านเครื่อง SATO (SBPL)',
      // },

      // {
      //   name: 'จัดการพนักงาน',
      //   href: '/admin/management/employee',
      //   icon: IdCard,
      //   description: 'จัดการพนักงาน',
      // },
      // {
      //   name: 'ผู้ใช้งานในตู้ Cabinet',
      //   href: '/admin/management/cabinet-users',
      //   icon: ContactRound,
      //   description: 'จัดการ User ในตู้ Cabinet',
      // },

    ],
  },
  {
    name: 'ประวัติการใช้งาน',
    href: '/admin/logs-history',
    icon: ClipboardList,
    description: 'ประวัติการใช้งานระบบ',
  },
];

/** รายการเมนูแบน สำหรับ Sidebar: ขยาย submenu เป็นลิงก์เดี่ยว (ไม่มี dropdown) */
export type AdminSidebarNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export function getAdminSidebarNavItems(): AdminSidebarNavItem[] {
  const fallback: LucideIcon = LayoutDashboard;
  const flat: AdminSidebarNavItem[] = [];

  for (const entry of adminMenuItems) {
    if (entry.submenu?.length) {
      for (const sub of entry.submenu) {
        flat.push({
          name: sub.name,
          href: sub.href,
          icon: sub.icon ?? entry.icon ?? fallback,
        });
      }
    } else if (entry.icon) {
      flat.push({
        name: entry.name,
        href: entry.href,
        icon: entry.icon,
      });
    }
  }

  return flat;
}
