'use client';

import { Badge } from '@/components/ui/badge';

interface MedicalSupplyDetailInfoGridProps {
  firstName: string;
  lastName: string;
  recordedBy: string;
  department: string;
  subDepartmentName: string;
  suppliesCount: number;
  billingStatus: string | undefined;
}

export function MedicalSupplyDetailInfoGrid({
  firstName,
  lastName,
  recordedBy,
  department,
  subDepartmentName,
  suppliesCount,
  billingStatus,
}: MedicalSupplyDetailInfoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <div>
        <p className="text-sm text-gray-500">ชื่อคนไข้</p>
        <p className="font-semibold">
          {firstName} {lastName}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">ผู้เบิก</p>
        <p className="font-semibold">{recordedBy}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">แผนก</p>
        <p className="font-semibold">{department}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">แผนกย่อย</p>
        <p className="font-semibold text-sm leading-snug mt-1">
          {subDepartmentName ? subDepartmentName : <span className="text-gray-400 font-normal">-</span>}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">จำนวนรายการ</p>
        <p className="font-semibold">
          {suppliesCount} รายการ
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">สถานะใบเสร็จ</p>
        <div className="mt-1">
          {!billingStatus ? (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-500" />
              ไม่ระบุ
            </Badge>
          ) : billingStatus.toLowerCase() === 'cancelled' ? (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500" />
              ยกเลิก
            </Badge>
          ) : billingStatus.toLowerCase() === 'paid' ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />
              ชำระแล้ว
            </Badge>
          ) : billingStatus.toLowerCase() === 'pending' ? (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-yellow-500" />
              รอชำระ
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
              {billingStatus}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
