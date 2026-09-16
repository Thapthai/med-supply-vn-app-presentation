'use client';

import { Printer } from 'lucide-react';

export default function PrintStickerHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-2.5 shadow-lg">
        <Printer className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติ๊กเกอร์</h1>
      </div>
    </div>
  );
}
