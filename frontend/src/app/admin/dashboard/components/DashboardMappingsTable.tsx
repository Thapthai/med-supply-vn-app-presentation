"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import CabinetDetailsCard from "@/app/admin/management/cabinet-departments/components/CabinetDetailsCard";

export interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
}

interface DashboardMappingsTableProps {
  mappings: CabinetDepartment[];
  loading: boolean;
}

const TABLE_COL_SPAN = 5;
const ITEMS_PER_PAGE = 5;

export default function DashboardMappingsTable({ mappings, loading }: DashboardMappingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);

  const totalPages = Math.ceil(mappings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMappings = mappings.slice(startIndex, endIndex);

  return (
    <>
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl h-full min-h-0 flex flex-col">
        <CardHeader className="flex shrink-0 flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-sm text-gray-600">กำลังโหลด...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-b-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ลำดับ</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ชื่อตู้</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">Division</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">สถานะ</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMappings.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={TABLE_COL_SPAN}
                          className="px-4 py-14 text-center text-slate-500 sm:px-5"
                        >
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentMappings.map((mapping, index) => (
                        <TableRow
                          key={mapping.id}
                          className={`cursor-pointer transition-colors ${
                            selectedRow?.id === mapping.id ? "bg-blue-50/80" : "hover:bg-slate-50/80"
                          }`}
                          onClick={() => setSelectedRow(mapping)}
                        >
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">{startIndex + index + 1}</TableCell>
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                            {mapping.cabinet?.cabinet_name || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                            {mapping.department?.DepName || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                            <Badge
                              variant={mapping.status === "ACTIVE" ? "default" : "secondary"}
                              className={
                                mapping.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                  : ""
                              }
                            >
                              {mapping.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate px-3 py-3.5 sm:px-4 sm:py-4">
                            {mapping.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="text-sm text-gray-600">
                    แสดง {startIndex + 1}-{Math.min(endIndex, mappings.length)} จาก {mappings.length} รายการ
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ก่อนหน้า
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedRow && (
        <CabinetDetailsCard selectedRow={selectedRow} onClose={() => setSelectedRow(null)} asModal />
      )}
    </>
  );
}
