import { z } from 'zod';

/** สคีมาเฉพาะโฟลเดอร์สำรอง — ยังใช้ stock_id ไม่ใช่ machine_ip */
const cabinetFormObject = z.object({
  cabinet_name: z
    .string()
    .trim()
    .min(1, 'ชื่อตู้ต้องไม่ว่าง')
    .min(2, 'ชื่อตู้ต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(255, 'ชื่อตู้ต้องไม่เกิน 255 ตัวอักษร'),
  stock_id: z.string().optional(),
  cabinet_type: z.enum(['WEIGHING', 'RFID'], {
    message: 'กรุณาเลือกประเภทตู้',
  }),
  temp_min: z.string().optional(),
  temp_max: z.string().optional(),
  hum_min: z.string().optional(),
  hum_max: z.string().optional(),
});

export const backupCabinetFormSchema = cabinetFormObject;

export type BackupCabinetFormData = z.infer<typeof backupCabinetFormSchema>;

export const backupCabinetEditFormSchema = cabinetFormObject.extend({
  cabinet_status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type BackupCabinetEditFormData = z.infer<typeof backupCabinetEditFormSchema>;
