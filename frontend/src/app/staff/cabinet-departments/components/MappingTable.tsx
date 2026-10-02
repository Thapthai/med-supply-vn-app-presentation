"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Download } from "lucide-react";
import CabinetDetailsCard from "./CabinetDetailsCard";

interface CabinetDepartment {
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

interface MappingTableProps {
  mappings: CabinetDepartment[];
  onEdit: (mapping: CabinetDepartment) => void;
  onDelete: (mapping: CabinetDepartment) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

const TABLE_COL_SPAN = 7;
const itemsPerPage = 5;

export default function MappingTable({ mappings, onEdit, onDelete, onExportExcel, onExportPdf }: MappingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);

  const totalPages = Math.ceil(mappings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const handleRowClick = (mapping: CabinetDepartment) => {
    setSelectedRow(mapping);
  };

  return (
    <>
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
          <div className="flex shrink-0 gap-2">
            {onExportExcel && (
              <Button onClick={onExportExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            )}
            {onExportPdf && (
              <Button onClick={onExportPdf} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ลำดับ</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ชื่อตู้</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">แผนก</TableHead>
                  {/* <TableHead className="px-3 py-3.5 text-center text-slate-600 sm:px-4 sm:py-4">
                    จำนวนอุปกรณ์
                  </TableHead> */}
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">สถานะ</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">หมายเหตุ</TableHead>
                  <TableHead className="px-3 py-3.5 text-right text-slate-600 sm:px-4 sm:py-4">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMappings.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={TABLE_COL_SPAN} className="px-4 py-14 text-center text-slate-500 sm:px-5">
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
                      onClick={() => handleRowClick(mapping)}
                    >
                      <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">{startIndex + index + 1}</TableCell>
                      <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                        {mapping.cabinet?.cabinet_name || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                        {mapping.department?.DepName || "-"}
                      </TableCell>
                        {/* <TableCell className="px-3 py-3.5 text-center sm:px-4 sm:py-4">
                          <span className="font-medium text-slate-700">
                            {mapping.itemstock_dispensed_count ?? 0} / {mapping.itemstock_count ?? 0}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">(ถูกเบิก / ในตู้)</span>
                        </TableCell> */}
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
                      <TableCell
                        className="px-3 py-3.5 text-right sm:px-4 sm:py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEdit(mapping)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(mapping)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        </CardContent>
      </Card>

      {selectedRow && (
        <CabinetDetailsCard selectedRow={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </>
  );
}
