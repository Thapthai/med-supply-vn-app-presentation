import { redirect } from 'next/navigation';

/** เดิมอยู่ใต้ management — ย้ายไป `/staff/print-sticker` */
export default function LegacyStaffPrintStickerPage() {
  redirect('/staff/print-sticker');
}
