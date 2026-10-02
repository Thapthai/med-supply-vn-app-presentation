"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Download, ChevronDown, ChevronRight, Network } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface CabinetGroup {
  cabinet_id: number;
  cabinet?: CabinetDepartment["cabinet"];
  mappings: CabinetDepartment[];
}

function divisionLabel(m: CabinetDepartment): string {
  return m.department?.DepName?.trim() || `แผนก #${m.department_id}`;
}

function groupMappingsByCabinet(rows: CabinetDepartment[]): CabinetGroup[] {
  const map = new Map<number, CabinetDepartment[]>();
  for (const m of rows) {
    const list = map.get(m.cabinet_id) ?? [];
    list.push(m);
    map.set(m.cabinet_id, list);
  }
  return Array.from(map.entries())
    .map(([cabinet_id, mappings]) => ({
      cabinet_id,
      cabinet: mappings[0]?.cabinet,
      mappings: [...mappings].sort((a, b) =>
        (a.department?.DepName || "").localeCompare(b.department?.DepName || "", "th"),
      ),
    }))
    .sort((a, b) =>
      (a.cabinet?.cabinet_name || "").localeCompare(b.cabinet?.cabinet_name || "", "th"),
    );
}

interface MappingTableProps {
  mappings: CabinetDepartment[];
  onEdit: (mapping: CabinetDepartment) => void;
  onDelete: (mapping: CabinetDepartment) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onCreateClick?: () => void;
}

/** คอลัมน์หลัก: ลูกศร + ลำดับ + ตู้ + แผนก + สถานะ + หมายเหตุ + จัดการ */
const COLUMN_COUNT = 7;
const itemsPerPage = 5;

export default function MappingTable({
  mappings,
  onEdit,
  onDelete,
  onExportExcel,
  onExportPdf,
  onCreateClick,
}: MappingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);
  const [expandedCabinetId, setExpandedCabinetId] = useState<number | null>(null);

  const groups = useMemo(() => groupMappingsByCabinet(mappings), [mappings]);

  const totalPages = Math.ceil(groups.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGroups = groups.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    if (expandedCabinetId == null) return;
    if (!groups.some((g) => g.cabinet_id === expandedCabinetId)) {
      setExpandedCabinetId(null);
    }
  }, [groups, expandedCabinetId]);

  return (
    <>
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              รายการตู้ ({groups.length})
            </span>
            <span className="text-sm font-normal text-slate-500">
              การเชื่อมโยงทั้งหมด {mappings.length} รายการ
            </span>
          </CardTitle>
          {onCreateClick ? (
            <Button
              type="button"
              onClick={onCreateClick}
              className="shrink-0 gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm hover:from-blue-600 hover:to-purple-700"
            >
              <Network className="h-4 w-4" />
              เพิ่มการเชื่อมโยง
            </Button>
          ) : null}
          {/* <div className="flex shrink-0 gap-2">
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
          </div> */}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                  <TableHead className="w-12 px-2 py-3.5 sm:px-3 sm:py-4" />
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ลำดับ</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ตู้ Cabinet</TableHead>
                  <TableHead className="min-w-[160px] px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">
                    แผนกที่เชื่อมโยง
                  </TableHead>


                </TableRow>
              </TableHeader>
              <TableBody>
                {currentGroups.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMN_COUNT} className="px-4 py-14 text-center text-slate-500 sm:px-5">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  currentGroups.map((group, index) => {
                    const isExpanded = expandedCabinetId === group.cabinet_id;

                    return (
                      <Fragment key={group.cabinet_id}>
                        <TableRow
                          className={cn(
                            "transition-colors hover:bg-slate-50/80",
                            isExpanded && "bg-slate-50/60",
                          )}
                        >
                          <TableCell className="w-12 px-2 py-3.5 sm:px-3 sm:py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCabinetId(isExpanded ? null : group.cabinet_id)
                              }
                              className="rounded p-1 hover:bg-slate-200"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">{startIndex + index + 1}</TableCell>
                          <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                            <div className="font-medium text-slate-800">
                              {group.cabinet?.cabinet_name || "-"}
                            </div>
                            {group.cabinet?.cabinet_code ? (
                              <div className="text-xs font-mono text-slate-500">{group.cabinet.cabinet_code}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-md px-3 py-3.5 text-sm text-muted-foreground sm:px-4 sm:py-4">
                            <p
                              className="line-clamp-3 max-h-[4.5rem] break-words [overflow-wrap:anywhere]"
                              title={group.mappings.map((m) => divisionLabel(m)).join(" · ")}
                            >
                              {group.mappings.map((m) => divisionLabel(m)).join(" · ")}
                            </p>
                          </TableCell>

                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                                  <Package className="h-4 w-4" />
                                  แผนกที่เชื่อมโยงกับตู้นี้ ({group.mappings.length} รายการ)
                                </h4>
                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="w-14 text-slate-600">ลำดับ</TableHead>
                                        <TableHead className="text-slate-600">แผนก</TableHead>
                                        <TableHead className="text-slate-600">สถานะ</TableHead>
                                        <TableHead className="text-slate-600">หมายเหตุ</TableHead>
                                        <TableHead className="text-right text-slate-600">จัดการ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.mappings.map((m, idx) => (
                                        <TableRow
                                          key={m.id}
                                          className={cn(
                                            "cursor-pointer border-b border-slate-100 last:border-0",
                                            selectedRow?.id === m.id
                                              ? "bg-blue-50/80 hover:bg-blue-50"
                                              : "hover:bg-slate-50/80",
                                          )}
                                          onClick={() => setSelectedRow(m)}
                                        >
                                          <TableCell className="text-slate-600">{idx + 1}</TableCell>
                                          <TableCell className="font-medium text-slate-800">
                                            {divisionLabel(m)}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={m.status === "ACTIVE" ? "default" : "secondary"}
                                              className={
                                                m.status === "ACTIVE"
                                                  ? "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                                  : ""
                                              }
                                            >
                                              {m.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="max-w-xs truncate text-slate-700">
                                            {m.description || "-"}
                                          </TableCell>
                                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end flex-wrap gap-2">
                                              <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button variant="destructive" size="sm" onClick={() => onDelete(m)}>
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {groups.length > itemsPerPage && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-sm text-gray-600">
                แสดง {startIndex + 1}-{Math.min(endIndex, groups.length)} จาก {groups.length} ตู้
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
