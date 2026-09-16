'use client';

import { DatePickerBE } from '@/components/ui/date-picker-be';

export type DateInputProps = {
  /** YYYY-MM-DD (ค.ศ.) — ค่าว่างได้ */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** เปิดปฏิทินเป็น portal (ใช้ใน table / overflow) */
  popoverPortal?: boolean;
};

/** ช่องเลือกวันที่ (ค.ศ.) กลางของแอป — ค่าในระบบเป็น YYYY-MM-DD (ค.ศ.) */
export function DateInput(props: DateInputProps) {
  return <DatePickerBE {...props} />;
}
