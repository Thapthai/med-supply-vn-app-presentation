'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { fetchStaffDepartmentsForFilter } from '@/lib/staffDepartmentScope';
import { toast } from 'sonner';
import { History, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MedicalSuppliesTable from './components/MedicalSuppliesTable';
import CancelBillDialog from './components/CancelBillDialog';
import { formatPrintDateTime, formatUtcDateTime } from '@/lib/formatThaiDateTime';
export default function MedicalSuppliesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [cancelBillDialogOpen, setCancelBillDialogOpen] = useState(false);
  const [selectedSupplyForCancel, setSelectedSupplyForCancel] = useState<any>(null);

  // Staff user from localStorage (department_id, department_name from login)
  const [staffDepartment, setStaffDepartment] = useState<{ department_id: number | null; department_name: string | null }>({
    department_id: null,
    department_name: null,
  });
  const [departments, setDepartments] = useState<{ ID: number; DepName: string }[]>([]);
  const [staffUserLoaded, setStaffUserLoaded] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form filters (for display in form, doesn't trigger search)
  const [formFilters, setFormFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    patientEN: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    usageType: '',
  });

  // Active filters (for actual search, triggers fetchSupplies)
  const [activeFilters, setActiveFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    patientEN: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    usageType: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const fetchIdRef = useRef(0);

  const fetchSupplies = async (customFilters?: typeof activeFilters, customPage?: number) => {
    const currentFetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      const filtersToUse = customFilters || activeFilters;
      const activePage = customPage !== undefined ? customPage : currentPage;

      const params: any = {
        page: activePage,
        limit: itemsPerPage,
      };

      if (filtersToUse.startDate) params.startDate = filtersToUse.startDate;
      if (filtersToUse.endDate) params.endDate = filtersToUse.endDate;
      if (filtersToUse.userName) params.user_name = filtersToUse.userName;
      if (filtersToUse.itemName) params.keyword = filtersToUse.itemName;
      if (filtersToUse.patientHN?.trim()) params.patient_hn = filtersToUse.patientHN.trim();
      if (filtersToUse.patientEN?.trim()) params.EN = filtersToUse.patientEN.trim();
      if (filtersToUse.usageType?.trim()) params.usage_type = filtersToUse.usageType.trim();
      if (staffDepartment.department_id != null) params.department_code = String(staffDepartment.department_id);

      const response: any = await staffMedicalSuppliesApi.getAll(params);

      // ใช้เฉพาะ response ล่าสุด (กัน stale response เขียนทับ)
      if (currentFetchId !== fetchIdRef.current) return;

      if (response && response.data) {
        let dataArray: any[] = [];

        if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          dataArray = [response.data];
        }

        setSupplies(dataArray);

        const totalItems = response.total || dataArray.length;
        const calculatedPages = Math.ceil(totalItems / itemsPerPage);

        setTotalPages(calculatedPages || 1);
        setTotalItems(totalItems);
      } else {
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      if (currentFetchId !== fetchIdRef.current) return;
      console.error('Failed to fetch medical supplies:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      if (currentFetchId === fetchIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    setStaffUserLoaded(true);
  }, []);

  useEffect(() => {
    fetchStaffDepartmentsForFilter({ limit: 500 })
      .then((list) => {
        if (list.length > 0) {
          const mapped = list.map((d) => ({
            ID: d.ID,
            DepName: d.DepName || d.DepName2 || String(d.ID),
          }));
          setDepartments(mapped);
          setStaffDepartment((prev) => {
            if (prev.department_id != null) return prev;
            const first = mapped[0];
            return { department_id: first.ID, department_name: first.DepName };
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch หลัง mount แล้ว (แผนกเลือกได้ — ไม่ล็อกจากโปรไฟล์)
  useEffect(() => {
    if (!staffUserLoaded) return;
    fetchSupplies(activeFilters, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUserLoaded, activeFilters, currentPage, staffDepartment.department_id]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    // Copy formFilters to activeFilters to trigger search
    setActiveFilters(formFilters);
    setCurrentPage(1);
    // ปิดการ์ดรายละเอียดเมื่อมีการกรอง/ค้นหาใหม่ (จะโหลดใหม่เมื่อเลือกแถวอีกครั้ง)
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
  };

  const handleReset = () => {
    const resetFilters = {
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      patientHN: '',
      patientEN: '',
      keyword: '',
      userName: '',
      firstName: '',
      lastName: '',
      assessionNo: '',
      itemName: '',
      usageType: '',
    };
    setFormFilters(resetFilters);
    setActiveFilters(resetFilters);
    setCurrentPage(1);
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    if (departments.length > 0) {
      const first = departments[0];
      setStaffDepartment({ department_id: first.ID, department_name: first.DepName });
    }
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
  };

  const handleSelectSupply = (supply: any) => {
    const supplyData = supply.data || supply;
    const id = supply.id || supplyData.id;
    setSelectedSupply(supply);
    setSelectedSupplyId(id);
    setTimeout(() => {
      const detailSection = document.getElementById('supply-details');
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCancelBill = (supply: any) => {
    setSelectedSupplyForCancel(supply);
    setCancelBillDialogOpen(true);
  };

  const handleCancelBillSuccess = () => {
    fetchSupplies();
    setSelectedSupply(null);
    setSelectedSupplyId(null);
  };

  const formatDate = (dateString: string | null | undefined) => formatUtcDateTime(dateString);

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 pb-4 sm:pb-6">
        {/* Header - ตรง admin/medical-supplies */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white truncate">
                บันทึกใช้อุปกรณ์กับคนไข้
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                ประวัติการเบิกอุปกรณ์จากตู้ SmartCabinet
              </p>
            </div>
          </div>
        </div>

        {/* Search Filters - รูปแบบเดียวกับ admin/medical-supplies */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm w-full min-w-0">
          <div className="font-bold text-base sm:text-lg mb-4">
            วันที่เบิกอุปกรณ์ใช้กับคนไข้
          </div>
          <div className="space-y-4">
            {/* บรรทัดที่ 1: วันที่เริ่มต้น | วันที่สิ้นสุด */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                <DatePickerBE
                  id="startDate"
                  value={formFilters.startDate}
                  onChange={(v) => setFormFilters({ ...formFilters, startDate: v })}
                  placeholder="วว/ดด/ปปปป (ค.ศ.)"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <DatePickerBE
                  id="endDate"
                  value={formFilters.endDate}
                  onChange={(v) => setFormFilters({ ...formFilters, endDate: v })}
                  placeholder="วว/ดด/ปปปป (ค.ศ.)"
                />
              </div>
            </div>

            {/* บรรทัดที่ 2: ค้นหาชื่ออุปกรณ์ | แผนก */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="itemName">ค้นหาชื่ออุปกรณ์</Label>
                <Input
                  id="itemName"
                  placeholder="กรอกชื่ออุปกรณ์..."
                  value={formFilters.itemName}
                  onChange={(e) => setFormFilters({ ...formFilters, itemName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>แผนก</Label>
                <Select
                  value={
                    staffDepartment.department_id != null ? String(staffDepartment.department_id) : undefined
                  }
                  onValueChange={(value) => {
                    const id = parseInt(value, 10);
                    const dept = departments.find((d) => d.ID === id);
                    setStaffDepartment({
                      department_id: Number.isNaN(id) ? null : id,
                      department_name: dept?.DepName ?? null,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกแผนก" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.ID} value={String(d.ID)}>
                        {d.DepName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* บรรทัดที่ 3: รหัสแผนกย่อย | HN | EN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="subDeptCode">รหัสแผนกย่อย</Label>
                <Input
                  id="subDeptCode"
                  placeholder="กรอกรหัสแผนกย่อย (ค้นหาแบบตรงกับรหัส)..."
                  value={formFilters.usageType}
                  onChange={(e) => setFormFilters({ ...formFilters, usageType: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="patientHN">HN</Label>
                <Input
                  id="patientHN"
                  placeholder="กรอกเลข HN..."
                  value={formFilters.patientHN}
                  onChange={(e) => setFormFilters({ ...formFilters, patientHN: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="patientEN">EN</Label>
                <Input
                  id="patientEN"
                  placeholder="กรอกเลข EN..."
                  value={formFilters.patientEN}
                  onChange={(e) => setFormFilters({ ...formFilters, patientEN: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-2 shrink-0" />
              ค้นหา
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
              รีเซ็ต
            </Button>
            <Button onClick={() => fetchSupplies()} variant="outline" disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 shrink-0 ${loading ? 'animate-spin' : ''}`} />
              โหลดใหม่
            </Button>
          </div>
        </div>

        {/* Table */}
        <MedicalSuppliesTable
          loading={loading}
          supplies={supplies}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onSelectSupply={handleSelectSupply}
          selectedSupplyId={selectedSupplyId}
          onCancelBill={handleCancelBill}
          filters={activeFilters}
        />

        {/* Detail Section - ตรง admin/medical-supplies */}
        {selectedSupply && selectedSupplyId && (
          <div id="supply-details" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-base sm:text-lg truncate">รายละเอียดการเบิกอุปกรณ์</CardTitle>
                <CardDescription className="text-xs sm:text-sm break-words">
                  HN: {selectedSupply.data?.patient_hn || selectedSupply.patient_hn || '-'} |
                  Assession No: {(() => {
                    const supplyItems = selectedSupply.data?.supply_items || selectedSupply.supply_items || [];
                    const assessionNos = [...new Set(
                      supplyItems
                        .map((item: any) => item.assession_no)
                        .filter((no: string) => no && no.trim() !== '')
                    )];
                    return assessionNos.length > 0 ? assessionNos.join(', ') : '-';
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
                <div className="space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ชื่อคนไข้</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.first_name || selectedSupply.first_name || ''}{' '}
                        {selectedSupply.data?.lastname || selectedSupply.lastname || ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ผู้เบิก</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.recorded_by_display ||
                          selectedSupply.recorded_by_display ||
                          selectedSupply.recorded_by_name ||
                          selectedSupply.data?.recorded_by_name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">แผนก</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.department_name || selectedSupply.department_name ||
                          selectedSupply.data?.department_code || selectedSupply.department_code || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">แผนกย่อย</p>
                      <p className="font-semibold text-sm leading-snug mt-1">
                        {(() => {
                          const d = selectedSupply.data as Record<string, unknown> | undefined;
                          const name = String(
                            d?.sub_department_name ?? selectedSupply.sub_department_name ?? '',
                          ).trim();
                          return name || <span className="text-gray-400 font-normal">-</span>;
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">จำนวนรายการ</p>
                      <p className="font-semibold">
                        {selectedSupply.supplies_count || selectedSupply.data?.supplies_count ||
                          (selectedSupply.data?.supply_items || selectedSupply.supply_items || []).length || 0}{' '}
                        รายการ
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">สถานะใบเสร็จ</p>
                      <div className="mt-1">
                        {(() => {
                          const status = selectedSupply.data?.billing_status || selectedSupply.billing_status;
                          if (!status) {
                            return (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-500" />
                                ไม่ระบุ
                              </Badge>
                            );
                          }
                          const statusLower = status.toLowerCase();
                          if (statusLower === 'cancelled') {
                            return (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500" />
                                ยกเลิก
                              </Badge>
                            );
                          }
                          if (statusLower === 'paid') {
                            return (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />
                                ชำระแล้ว
                              </Badge>
                            );
                          }
                          if (statusLower === 'pending') {
                            return (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-yellow-500" />
                                รอชำระ
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
                              {status}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">วันเวลา</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <p className="text-sm text-gray-500">เวลาที่เบิก</p>
                        <p className="font-semibold">
                          {formatDate(
                            selectedSupply.created_at ||
                            selectedSupply.data?.created_at ||
                            selectedSupply.data?.usage_datetime
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันที่และเวลาที่พิมพ์บิล</p>
                        <p className="font-semibold">
                          {(() => {
                            const printDate = selectedSupply.data?.print_date || selectedSupply.print_date;
                            const timePrintDate = selectedSupply.data?.time_print_date || selectedSupply.time_print_date;
                            if (!printDate?.trim() && !timePrintDate?.trim()) return '-';
                            const dateTimeStr = printDate?.trim()
                              ? (printDate.includes('T') ? printDate : `${printDate}T${timePrintDate?.trim() || '00:00:00'}`)
                              : null;
                            return dateTimeStr ? formatDate(dateTimeStr) : '-';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันที่แก้ไขล่าสุด</p>
                        <p className="font-semibold">
                          {(selectedSupply.updated_at || selectedSupply.data?.updated_at)
                            ? formatDate(selectedSupply.updated_at || selectedSupply.data?.updated_at)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-base sm:text-lg">รายการอุปกรณ์ที่เบิก</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  รายละเอียดอุปกรณ์ทั้งหมดที่เบิกในครั้งนี้
                  {activeFilters.startDate || activeFilters.endDate ? (
                    <span className="block mt-2 text-foreground/80 font-medium break-words">
                      แสดงตามวันที่เลือก: {activeFilters.startDate || '–'} ถึง {activeFilters.endDate || '–'}
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
                <p className="text-xs text-gray-500 mb-2 md:hidden">เลื่อนแนวนอนเพื่อดูคอลัมน์ทั้งหมด</p>
                <div className="overflow-x-auto -mx-3 sm:mx-0 max-w-full">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 sm:w-[80px] text-xs sm:text-sm whitespace-nowrap">ลำดับ</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm">รหัสอุปกรณ์</TableHead>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm">ชื่ออุปกรณ์</TableHead>
                        <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวน</TableHead>
                        <TableHead className="min-w-[60px] text-xs sm:text-sm">หน่วย</TableHead>
                        <TableHead className="min-w-[90px] text-xs sm:text-sm">Assession No</TableHead>
                        <TableHead className="min-w-[100px] text-xs sm:text-sm whitespace-nowrap">วันที่สร้าง</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const supplyItems = selectedSupply.data?.supply_items || selectedSupply.supply_items || [];
                        const startDate = activeFilters.startDate || '';
                        const endDate = activeFilters.endDate || '';

                        const toLocalDateStr = (d: string | Date | null | undefined): string => {
                          if (!d) return '';
                          const dt = new Date(d);
                          const y = dt.getFullYear();
                          const m = String(dt.getMonth() + 1).padStart(2, '0');
                          const day = String(dt.getDate()).padStart(2, '0');
                          return `${y}-${m}-${day}`;
                        };
                        const inRange = (dateStr: string) => {
                          if (!dateStr) return false;
                          if (!startDate && !endDate) return true;
                          if (startDate && dateStr < startDate) return false;
                          if (endDate && dateStr > endDate) return false;
                          return true;
                        };
                        const filteredByDate = supplyItems.filter((item: any) => {
                          const createdStr = toLocalDateStr(item.created_at);
                          return inRange(createdStr);
                        });

                        if (filteredByDate.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-6 sm:py-8 text-gray-500 text-sm">
                                {supplyItems.length === 0
                                  ? 'ไม่มีรายการอุปกรณ์'
                                  : 'ไม่มีรายการอุปกรณ์ที่สร้างหรือแก้ไขในช่วงวันที่ที่กรอง'}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return filteredByDate
                          .map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3">{index + 1}</TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm py-2 sm:py-3">{item.order_item_code || item.supply_code || '-'}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-3 max-w-[140px] sm:max-w-none truncate" title={item.order_item_description || item.supply_name}>{item.order_item_description || item.supply_name || '-'}</TableCell>
                              <TableCell className="text-center font-semibold text-xs sm:text-sm py-2 sm:py-3">{item.qty || item.quantity || 0}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-3">{item.uom || item.unit || '-'}</TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm py-2 sm:py-3">{item.assession_no || '-'}</TableCell>
                              <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">{item.created_at ? formatDate(item.created_at) : '-'}</TableCell>
                              <TableCell className="py-2 sm:py-3">
                                {(() => {
                                  const status = item.order_item_status || '-';
                                  const statusLower = status.toLowerCase();

                                  if (statusLower === 'discontinue' || statusLower === 'discontinued') {
                                    return (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                                        ยกเลิก
                                      </Badge>
                                    );
                                  } else if (statusLower === 'verified') {
                                    return (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                                        ยืนยันแล้ว
                                      </Badge>
                                    );
                                  } else if (status === '-') {
                                    return <span className="text-gray-400 text-xs sm:text-sm">-</span>;
                                  } else {
                                    return (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500"></span>
                                        {status}
                                      </Badge>
                                    );
                                  }
                                })()}
                              </TableCell>
                            </TableRow>
                          ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <CancelBillDialog
        open={cancelBillDialogOpen}
        onOpenChange={setCancelBillDialogOpen}
        supply={selectedSupplyForCancel}
        onSuccess={handleCancelBillSuccess}
      />
    </>
  );
}
