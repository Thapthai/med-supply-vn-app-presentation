import { z } from 'zod';
import { stockIdFromMachineIp } from '@/app/admin/management/cabinets/components/cabinetTypes';

export const loginSchema = z.object({
  email: z.string().email('กรุณาใส่อีเมลที่ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('กรุณาใส่อีเมลที่ถูกต้อง'),
  password: z.string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
    .regex(/[^a-zA-Z0-9]/, 'รหัสผ่านต้องมีอักษรพิเศษอย่างน้อย 1 ตัว'),
});

export const itemSchema = z
  .object({
    itemcode: z.string().min(1, 'รหัสสินค้าต้องไม่ว่าง').max(25, 'รหัสสินค้าต้องไม่เกิน 25 ตัวอักษร'),
    itemname: z.string().min(2, 'ชื่ออุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร').max(255, 'ชื่ออุปกรณ์ต้องไม่เกิน 255 ตัวอักษร'),
    Barcode: z.string().max(50).optional(),
    Description: z.string().optional(),
    CostPrice: z.number().min(0, 'ราคาทุนต้องไม่น้อยกว่า 0').optional(),
    SalePrice: z.number().min(0).optional(),
    UsagePrice: z.number().min(0).optional(),
    stock_balance: z.number().int().min(0).optional(),
    stock_min: z.number().int().min(0).optional(),
    stock_max: z.number().int().min(0).optional(),
    item_status: z.number().int().optional(),
    IsCancel: z.number().int().min(0).max(1).optional(),
    DepartmentID: z.number().int().min(0).optional(),
    warehouseID: z.number().int().optional(),
    /** หน่วย — stock / ธุรกรรม */
    UnitID: z.number().int().positive().optional(),
    /** หน่วยการเบิก — แสดงผล */
    SubUnitID: z.number().int().positive().optional(),
    /** เช่น 18 เม็ดต่อ 1 หน่วย */
    SubUnitQty: z.number().int().min(1).optional(),
  })
  .refine((d) => !d.SubUnitQty || (d.SubUnitID != null && d.SubUnitID > 0), {
    message: 'เลือกหน่วยการเบิกเมื่อระบุจำนวนต่อหลัก',
    path: ['SubUnitID'],
  });

export const categorySchema = z.object({
  name: z.string().min(2, 'ชื่อหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร').max(100, 'ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร'),
  description: z.string().max(500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร').optional(),
  slug: z.string().optional(),
  is_active: z.boolean(),
});

function optionalLimit(label: string, min: number, max: number) {
  return z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v?.trim()) return true;
        const n = Number(v.trim());
        return Number.isFinite(n) && n >= min && n <= max;
      },
      { message: `${label} ต้องเป็นตัวเลขระหว่าง ${min} ถึง ${max}` },
    );
}

function limitNumber(raw?: string): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

const cabinetFormObject = z.object({
  cabinet_name: z
    .string()
    .trim()
    .min(1, 'ชื่อตู้ต้องไม่ว่าง')
    .min(2, 'ชื่อตู้ต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(255, 'ชื่อตู้ต้องไม่เกิน 255 ตัวอักษร'),
  machine_ip: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || stockIdFromMachineIp(v) != null, {
      message: 'รูปแบบ IP ไม่ถูกต้อง เช่น 192.168.1.2',
    }),
  cabinet_type: z.enum(['WEIGHING', 'RFID', 'NARCOTIC'], {
    message: 'กรุณาเลือกประเภทตู้',
  }),
  temp_min: optionalLimit('อุณหภูมิต่ำสุด', -50, 80),
  temp_max: optionalLimit('อุณหภูมิสูงสุด', -50, 80),
  hum_min: optionalLimit('ความชื้นต่ำสุด', 0, 100),
  hum_max: optionalLimit('ความชื้นสูงสุด', 0, 100),
});

function refineClimateRange(
  data: { temp_min?: string; temp_max?: string; hum_min?: string; hum_max?: string },
  ctx: z.RefinementCtx,
) {
  const tempMin = limitNumber(data.temp_min);
  const tempMax = limitNumber(data.temp_max);
  if (tempMin != null && tempMax != null && tempMin > tempMax) {
    ctx.addIssue({
      code: 'custom',
      path: ['temp_max'],
      message: 'อุณหภูมิสูงสุดต้องไม่ต่ำกว่าอุณหภูมิต่ำสุด',
    });
  }
  const humMin = limitNumber(data.hum_min);
  const humMax = limitNumber(data.hum_max);
  if (humMin != null && humMax != null && humMin > humMax) {
    ctx.addIssue({
      code: 'custom',
      path: ['hum_max'],
      message: 'ความชื้นสูงสุดต้องไม่ต่ำกว่าความชื้นต่ำสุด',
    });
  }
}

export const cabinetFormSchema = cabinetFormObject.superRefine(refineClimateRange);

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type CabinetFormData = z.infer<typeof cabinetFormSchema>;

export const cabinetEditFormSchema = cabinetFormObject
  .extend({
    cabinet_status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine(refineClimateRange);

export type CabinetEditFormData = z.infer<typeof cabinetEditFormSchema>;
