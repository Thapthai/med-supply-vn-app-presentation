'use client';

import Link from 'next/link';
import { Package, Users, Shield, Building2, Boxes, Layers, UserCog, Printer, Ruler } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** ลิงก์ทั้งหมดภายใต้ /staff/management เท่านั้น — ไม่ชี้ไป /admin */
const managementMenus = [
  {
    name: 'พิมพ์สติ๊กเกอร์',
    href: '/staff/print-sticker',
    icon: Printer,
    description: 'ส่ง SBPL ไปเครื่องปริ้น SATO',
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
  },
  {
    name: 'จัดการตู้ Cabinet',
    href: '/staff/management/cabinets',
    icon: Package,
    description: 'รายการตู้ เชื่อมแผนก และ User ในตู้ (ชื่อผู้ใช้ตู้ / ตู้ที่ขึ้นได้)',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    name: 'จัดการ Item (Master)',
    href: '/staff/management/items',
    icon: Boxes,
    description: 'รายการรหัสเวชภัณฑ์ในฐานข้อมูล',
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    name: 'จัดการหน่วยนับ (Unit)',
    href: '/staff/management/units',
    icon: Ruler,
    description: 'เพิ่ม แก้ไข ยกเลิกหน่วยนับสำหรับผูกกับ Item',
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-800',
  },
  {
    name: 'จัดการแผนก',
    href: '/staff/management/departments',
    icon: Building2,
    description: 'แผนกหลัก + รหัสแผนกย่อยจับคู่ Location',
    color: 'from-cyan-500 to-teal-600',
    bgLight: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-700',
  },
  {
    name: 'จัดการผู้ใช้งาน Staff',
    href: '/staff/management/permission-users',
    icon: Users,
    description: 'Staff Users และ Client Credentials',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    name: 'จัดการ Staff Role',
    href: '/staff/management/staff-roles',
    icon: UserCog,
    description: 'แก้ไขชื่อ Role ระดับสิทธิ์และสถานะ',
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
  },
  {
    name: 'กำหนดสิทธิ์ Roles Staff',
    href: '/staff/management/permission-roles',
    icon: Shield,
    description: 'สิทธิ์การเข้าถึงเมนูตาม Role',
    color: 'from-indigo-500 to-blue-600',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    name: 'Division หลักตาม Staff Role',
    href: '/staff/management/staff-role-permission-department',
    icon: Layers,
    description: 'จำกัด Division หลักที่แต่ละ Role เห็นได้',
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
];

export default function ManagementPage() {
  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">การจัดการ</h1>
            <p className="text-sm text-slate-500 mt-0.5">จัดการระบบ ตู้ Cabinet ผู้ใช้ Staff และสิทธิ์ (Staff portal)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementMenus.map((menu) => {
            const Icon = menu.icon;
            return (
              <Link key={menu.href} href={menu.href} className="group block h-full">
                <Card
                  className={`h-full overflow-hidden border-2 ${menu.borderColor} ${menu.bgLight} transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-opacity-80`}
                >
                  <CardHeader className="pb-2">
                    <div
                      className={`inline-flex p-3 rounded-xl ${menu.iconBg} ${menu.iconColor} mb-2 w-fit transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-lg text-slate-800 group-hover:text-slate-900">{menu.name}</CardTitle>
                    <CardDescription className="text-slate-600 leading-relaxed">{menu.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span
                      className={`inline-flex items-center text-sm font-medium bg-gradient-to-r ${menu.color} bg-clip-text text-transparent`}
                    >
                      ไปที่เมนู →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
