import {
    LayoutDashboard,
    Box,
    Package,
    History,
    FileBarChart,
    Settings,
    Users,
    Shield,
    UserCog,
    Network,
    RotateCcw,
    ClipboardList,
    Building2,
    Boxes,
    Printer,
    Ruler,
    BookMarked,
    ContactRound,
} from 'lucide-react';
// Type definitions for menu and submenu
export interface StaffMenuSubItem {
    name: string;
    href: string;
    description?: string;
    icon?: any;
    /** ถ้ากำหนด: แสดงเมนูนี้เฉพาะ role ที่ระบุ (คู่กับสิทธิ์จาก API ที่ไม่ถูกปิด) */
    roles?: string[];
    /** เปิด URL ภายนอกแทน `href` (เช่น แอปอื่น) — ใช้กับ `target="_blank"` ใน Sidebar */
    externalHref?: string;
}

export interface StaffMenuItem {
    name: string;
    href: string;
    icon?: any;
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

export const staffMenuItems = [
    {
        name: 'Dashboard',
        href: '/staff/dashboard',
        icon: LayoutDashboard,
        description: 'ภาพรวมระบบ',
    },
    {
        name: 'อุปกรณ์',
        href: '/staff/items',
        icon: Box,
        description: 'จัดการอุปกรณ์และสต๊อก',
        noHref: true,
        submenu: [
            {
                name: 'สต๊อกอุปกรณ์ในตู้',
                href: '/staff/items',
                description: 'กรองแบบทั้งหมดเป็นค่าเริ่มต้น — แคบด้วย Division / ตู้ได้',
                icon: Package,
            },
            {
                name: 'อุปกรณ์ยืม',
                href: '/staff/item-borrow',
                description: 'รายการยืมจาก slot detail พร้อม Division ที่ยืม/ที่ตั้งตู้',
                icon: BookMarked,
            },
            {
                name: 'เบิกอุปกรณ์ให้หน่วยงาน',
                href: '/staff/department-dispense',
                description: 'เลือก Division → รายการเบิก → ตำแหน่ง → เอกสารควบคุมการเบิก',
                icon: ClipboardList,
            },
            {
                name: 'เบิกอุปกรณ์จากตู้',
                href: '/staff/dispense-from-cabinet',
                description: 'กรองแบบทั้งหมดเป็นค่าเริ่มต้น — แคบด้วย Division / ตู้ได้',
                icon: FileBarChart,
            },
            {
                name: 'เติมอุปกรณ์เข้าตู้',
                href: '/staff/return-to-cabinet',
                description: 'กรองแบบทั้งหมดเป็นค่าเริ่มต้น — แคบด้วย Division / ตู้ได้',
                icon: FileBarChart,
            },
            {
                name: 'บันทึกใช้อุปกรณ์กับคนไข้',
                href: '/staff/medical-supplies',
                description: 'ประวัติการเบิกจากตู้ SmartCabinet — Division เริ่มที่ทั้งหมด แคบลงได้',
                icon: History,
            },
            {
                name: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
                href: '/staff/return',
                description: 'แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน',
                icon: RotateCcw,
            },

            {
                name: 'เปรียบเทียบตามเวชภัณฑ์',
                href: '/staff/item-comparison',
                description: 'เปรียบเทียบการเบิกกับการใช้งาน — Division เริ่มที่ทั้งหมด แคบลงได้',
                icon: FileBarChart,
            },
        ],
    },

    {
        name: 'ตั้งค่า',
        href: '/staff/management',
        icon: Settings,
        description: 'ตั้งค่าระบบ',
        noHref: true,
        submenu: [
            {
                name: 'จัดการตู้ Cabinet',
                href: '/staff/management/cabinets',
                icon: Package,
                description: 'จัดการตู้ Cabinet',
            },
            {
                name: 'จัดการพนักงาน',
                href: '/staff/management/staff-users',
                icon: Users,
                description: 'จัดการ Staff Users และ Client Credentials',
            },
            {
                name: 'จัดการ Staff Role',
                href: '/staff/management/staff-roles',
                icon: UserCog,
                description: 'แก้ไขชื่อ Role ระดับสิทธิ์และสถานะ — ตามสิทธิ์ระดับของคุณ',
            },
            {
                name: ' กำหนดสิทธิ์ Roles Staff',
                href: '/staff/management/permission-roles',
                icon: Shield,
                description: 'กำหนดสิทธิ์การเข้าถึงเมนู Roles Staff',
            },
            // {
            //     name: 'Cabinet - Division',
            //     href: '/staff/management/cabinet-departments',
            //     icon: Network,
            //     description: 'จัดการตู้ Cabinet และเชื่อมโยงกับ Division — กรอง Division เริ่มที่ทั้งหมด',
            // },

            {
                name: 'จัดการ อุปกรณ์',
                href: '/staff/management/items',
                icon: Boxes,
                description: 'รายการรหัสเวชภัณฑ์ในฐานข้อมูล',
            },
            // {
            //     name: 'จัดการหน่วยนับ (Unit)',
            //     href: '/staff/management/units',
            //     icon: Ruler,
            //     description: 'หน่วยนับสำหรับผูกกับรายการ Item',
            // },
            // {
            //     name: 'พิมพ์สติ๊กเกอร์',
            //     href: '/staff/management/print-sticker',
            //     icon: Printer,
            //     description: 'พิมพ์สติ๊กเกอร์ผ่านเครื่อง SATO (SBPL)',
            // },
            // {
            //     name: 'จัดการ Division',
            //     href: '/staff/management/departments',
            //     icon: Building2,
            //     description: 'ดู Division หลักและตั้งรหัส Division ย่อยจับคู่ Location คนไข้',
            // },

            // {
            //     name: 'จัดการ User ในตู้',
            //     href: '/staff/management/cabinet-users',
            //     icon: ContactRound,
            //     description: 'ชื่อผู้ใช้ตู้เชื่อมกับตู้ (Legacy stock_id / finger)',
            // },
            // {
            //     name: 'จัดการ ผู้ใช้งาน Staff',
            //     href: '/staff/management/permission-users',
            //     icon: Users,
            //     description: 'จัดการ User',
            // },

        ],
    },
    {
        name: 'ประวัติการใช้งาน',
        href: '/staff/logs-history',
        icon: ClipboardList,
        description: 'ประวัติการใช้งานระบบ',
    },


];
