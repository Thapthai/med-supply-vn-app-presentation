import { redirect } from 'next/navigation';

/** เดิมอยู่ใต้ management — ย้ายไป `/admin/print-sticker` */
export default function LegacyAdminPrintStickerPage() {
  redirect('/admin/print-sticker');
}
