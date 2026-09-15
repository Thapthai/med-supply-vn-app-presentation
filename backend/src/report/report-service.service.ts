import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MedicalSuppliesService } from '../medical-supplies/medical-supplies.service';
import { ComparisonReportExcelService } from './services/comparison_report_excel.service';
import { ComparisonReportPdfService } from './services/comparison_report_pdf.service';
import { EquipmentUsageExcelService } from './services/equipment_usage_excel.service';
import { EquipmentUsagePdfService } from './services/equipment_usage_pdf.service';
import { EquipmentDisbursementExcelService } from './services/equipment_disbursement_excel.service';
import { EquipmentDisbursementPdfService } from './services/equipment_disbursement_pdf.service';
import { ItemComparisonExcelService } from './services/item-comparison-excel.service';
import { ItemComparisonPdfService } from './services/item-comparison-pdf.service';
import { VendingMappingReportExcelService } from './services/vending-mapping-report-excel.service';
import { VendingMappingReportPdfService } from './services/vending-mapping-report-pdf.service';
import { UnmappedDispensedReportExcelService } from './services/unmapped-dispensed-report-excel.service';
import { UnusedDispensedReportExcelService } from './services/unused-dispensed-report-excel.service';
import { ReturnReportExcelService, ReturnReportData } from './services/return-report-excel.service';
import { ReturnReportPdfService } from './services/return-report-pdf.service';
import { CancelBillReportExcelService, CancelBillReportData } from './services/cancel-bill-report-excel.service';
import { CancelBillReportPdfService } from './services/cancel-bill-report-pdf.service';
import { ReturnToCabinetReportExcelService, ReturnToCabinetReportData } from './services/return-to-cabinet-report-excel.service';
import { ReturnToCabinetReportPdfService } from './services/return-to-cabinet-report-pdf.service';
import {
  ItemBorrowReportExcelService,
  ItemBorrowReportData,
  ItemBorrowReportRow,
} from './services/item-borrow-report-excel.service';
import { ItemBorrowReportPdfService } from './services/item-borrow-report-pdf.service';
import { buildReturnedGroups } from './utils/build-returned-groups';
import { buildDispensedGroups, sortDispensedItemsForReport } from './utils/build-dispensed-groups';
import { isValidCabinetFilterId } from './utils/cabinet-stock-row-highlight.util';
import { DispensedItemsExcelService, DispensedItemsReportData } from './services/dispensed-items-excel.service';
import { DispensedItemsPdfService } from './services/dispensed-items-pdf.service';
import {
  CabinetStockReportExcelService,
  CabinetStockReportData,
} from './services/cabinet-stock-report-excel.service';
import { CabinetStockReportPdfService } from './services/cabinet-stock-report-pdf.service';
import {
  CabinetDepartmentsReportExcelService,
  CabinetDepartmentsReportData,
  CabinetDepartmentsSubRow,
} from './services/cabinet-departments-report-excel.service';
import { CabinetDepartmentsReportPdfService } from './services/cabinet-departments-report-pdf.service';
import {
  WeighingDispenseReportExcelService,
  WeighingDispenseReportData,
} from './services/weighing-dispense-report-excel.service';
import { WeighingDispenseReportPdfService } from './services/weighing-dispense-report-pdf.service';
import { WeighingRefillReportExcelService } from './services/weighing-refill-report-excel.service';
import { WeighingRefillReportPdfService } from './services/weighing-refill-report-pdf.service';
import {
  WeighingStockReportExcelService,
  WeighingStockReportData,
} from './services/weighing-stock-report-excel.service';
import { WeighingStockReportPdfService } from './services/weighing-stock-report-pdf.service';
import {
  DispensedItemsForPatientsExcelService,
  DispensedItemsForPatientsReportData,
} from './services/dispensed-items-for-patients-excel.service';
import { DispensedItemsForPatientsPdfService } from './services/dispensed-items-for-patients-pdf.service';
import { GetMedicalSupplyUsagesQueryDto } from '../medical-supplies/dto/medical-supply.dto';
import {
  getOrderItemStatusLabel,
  groupSupplyItemsLatest,
  type SupplyUsageItemRow,
} from './utils/medical-supply-for-patients-report';
import { formatReportDateTime } from './utils/date-timeformat';
import { ComparisonReportData } from './types/comparison-report.types';
import { EquipmentUsageReportData } from './types/equipment-usage-report.types';
import { EquipmentDisbursementReportData } from './types/equipment-disbursement-report.types';
import { ItemComparisonReportData } from './types/item-comparison-report.types';
import { WeighingService } from '../weighing/weighing.service';
import { ItemService } from '../item/item.service';
import { CabinetTempHumService } from '../cabinet/cabinet-temp-hum.service';
import {
  CabinetTempHumReportExcelService,
  CabinetTempHumReportData,
} from './services/cabinet-temp-hum-report-excel.service';
import { CabinetTempHumReportPdfService } from './services/cabinet-temp-hum-report-pdf.service';
import { CabinetTempHumChartPdfService } from './services/cabinet-temp-hum-chart-pdf.service';
import { formatReportDateOnlyUtc, formatReportDateTimeUtc } from './utils/date-timeformat';

@Injectable()
export class ReportServiceService {
  constructor(
    private readonly medicalSuppliesService: MedicalSuppliesService,
    private readonly prisma: PrismaService,
    private readonly comparisonReportExcelService: ComparisonReportExcelService,
    private readonly comparisonReportPdfService: ComparisonReportPdfService,
    private readonly equipmentUsageExcelService: EquipmentUsageExcelService,
    private readonly equipmentUsagePdfService: EquipmentUsagePdfService,
    private readonly equipmentDisbursementExcelService: EquipmentDisbursementExcelService,
    private readonly equipmentDisbursementPdfService: EquipmentDisbursementPdfService,
    private readonly itemComparisonExcelService: ItemComparisonExcelService,
    private readonly itemComparisonPdfService: ItemComparisonPdfService,
    private readonly vendingMappingReportExcelService: VendingMappingReportExcelService,
    private readonly vendingMappingReportPdfService: VendingMappingReportPdfService,
    private readonly unmappedDispensedReportExcelService: UnmappedDispensedReportExcelService,
    private readonly unusedDispensedReportExcelService: UnusedDispensedReportExcelService,
    private readonly returnReportExcelService: ReturnReportExcelService,
    private readonly returnReportPdfService: ReturnReportPdfService,
    private readonly cancelBillReportExcelService: CancelBillReportExcelService,
    private readonly cancelBillReportPdfService: CancelBillReportPdfService,
    private readonly returnToCabinetReportExcelService: ReturnToCabinetReportExcelService,
    private readonly returnToCabinetReportPdfService: ReturnToCabinetReportPdfService,
    private readonly itemBorrowReportExcelService: ItemBorrowReportExcelService,
    private readonly itemBorrowReportPdfService: ItemBorrowReportPdfService,
    private readonly dispensedItemsExcelService: DispensedItemsExcelService,
    private readonly dispensedItemsPdfService: DispensedItemsPdfService,
    private readonly cabinetStockReportExcelService: CabinetStockReportExcelService,
    private readonly cabinetStockReportPdfService: CabinetStockReportPdfService,
    private readonly cabinetDepartmentsReportExcelService: CabinetDepartmentsReportExcelService,
    private readonly cabinetDepartmentsReportPdfService: CabinetDepartmentsReportPdfService,
    private readonly weighingDispenseReportExcelService: WeighingDispenseReportExcelService,
    private readonly weighingDispenseReportPdfService: WeighingDispenseReportPdfService,
    private readonly weighingRefillReportExcelService: WeighingRefillReportExcelService,
    private readonly weighingRefillReportPdfService: WeighingRefillReportPdfService,
    private readonly weighingStockReportExcelService: WeighingStockReportExcelService,
    private readonly weighingStockReportPdfService: WeighingStockReportPdfService,
    private readonly weighingService: WeighingService,
    private readonly dispensedItemsForPatientsExcelService: DispensedItemsForPatientsExcelService,
    private readonly dispensedItemsForPatientsPdfService: DispensedItemsForPatientsPdfService,
    private readonly itemService: ItemService,
    private readonly cabinetTempHumService: CabinetTempHumService,
    private readonly cabinetTempHumReportExcelService: CabinetTempHumReportExcelService,
    private readonly cabinetTempHumReportPdfService: CabinetTempHumReportPdfService,
    private readonly cabinetTempHumChartPdfService: CabinetTempHumChartPdfService,
  ) {}

  /** ชื่อแผนกบนรายงาน — logic เดียวกับ frontend ItemsTable.getItemDepartmentDisplay */
  private resolveItemDepartmentNameForReport(item: {
    department?: { DepName?: string | null; DepName2?: string | null };
    itemStocks?: Array<{
      cabinet?: {
        cabinetDepartments?: Array<{
          department?: { DepName?: string | null; DepName2?: string | null };
        }>;
      };
    }>;
  }): string {
    if (item.department?.DepName || item.department?.DepName2) {
      return item.department.DepName || item.department.DepName2 || '-';
    }
    const names = new Set<string>();
    (item.itemStocks ?? []).forEach((stock) => {
      stock.cabinet?.cabinetDepartments?.forEach((cd) => {
        const name = cd.department?.DepName || cd.department?.DepName2;
        if (name) names.add(name);
      });
    });
    return names.size > 0 ? [...names].join(', ') : '-';
  }

  private static readonly NEAR_EXPIRY_DAYS = 30;

  /** มีอุปกรณ์หมดอายุในตู้ — logic เดียวกับ item.service / ItemsTable (IsStock=1 และ ExpireDate < วันนี้) */
  private itemHasExpiredStock(item: {
    itemStocks?: Array<{ ExpireDate?: Date | string | null; IsStock?: boolean | number | null }>;
  }): boolean {
    const now = new Date();
    return (item.itemStocks ?? []).some((stock) => {
      if (!(stock.IsStock === true || stock.IsStock === 1)) return false;
      if (!stock.ExpireDate) return false;
      const exp = new Date(stock.ExpireDate);
      return !Number.isNaN(exp.getTime()) && exp < now;
    });
  }

  /** ใกล้หมดอายุภายใน 30 วัน — logic เดียวกับ ItemsTable (ไม่นับรายการที่หมดอายุแล้ว) */
  private itemHasNearExpiryStock(item: {
    itemStocks?: Array<{ ExpireDate?: Date | string | null; IsStock?: boolean | number | null }>;
  }): boolean {
    if (this.itemHasExpiredStock(item)) return false;
    const now = Date.now();
    const end = new Date(now);
    end.setDate(end.getDate() + ReportServiceService.NEAR_EXPIRY_DAYS);
    const endMs = end.getTime();
    return (item.itemStocks ?? []).some((stock) => {
      if (!(stock.IsStock === true || stock.IsStock === 1)) return false;
      if (!stock.ExpireDate) return false;
      const exp = new Date(stock.ExpireDate);
      const t = exp.getTime();
      return !Number.isNaN(t) && t >= now && t <= endMs;
    });
  }
  private formatCabinetReportDateDisplay(isoDate?: string): string {
    const d =
      isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
        ? new Date(`${isoDate}T12:00:00+07:00`)
        : new Date();
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
  }

  private cabinetStockSqlDay(isoDate?: string): Prisma.Sql {
    return isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? Prisma.sql`DATE(${isoDate})` : Prisma.sql`CURDATE()`;
  }

  private cabinetReportDateISO(asOfIso?: string): string {
    if (asOfIso && /^\d{4}-\d{2}-\d{2}$/.test(asOfIso)) return asOfIso;
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  }

  /**
   * Generate comparison report in Excel format
   */
  async generateComparisonExcel(usageId: number): Promise<{ buffer: Buffer; filename: string }> {
    try {

      // Fetch usage data from medical-supplies-service
      const usage = await this.medicalSuppliesService.findOne(usageId);
      if (!usage) {
        throw new Error(`Usage not found for ID: ${usageId}`);
      }

      // Fetch items data
      const items = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
      if (!items || items.length === 0) {
        throw new Error(`No items found for Usage ID: ${usageId}`);
      }

      // Prepare data for export
      const reportData: ComparisonReportData = {
        usage: {
          id: usage.id,
          patient_hn: usage.patient_hn ?? '',
          first_name: usage.first_name ?? '',
          lastname: usage.lastname ?? '',
          en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime != null ? new Date(usage.usage_datetime as any) : undefined,
        },
        items,
      };

      // Generate Excel
      const buffer = await this.comparisonReportExcelService.generateReport(reportData);
      const filename = `comparison_report_${usageId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate comparison report in PDF format
   */
  async generateComparisonPDF(usageId: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const usage = await this.medicalSuppliesService.findOne(usageId);
      if (!usage) {
        throw new Error(`Usage not found for ID: ${usageId}`);
      }

      const items = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
      if (!items || items.length === 0) {
        throw new Error(`No items found for Usage ID: ${usageId}`);
      }

      const reportData: ComparisonReportData = {
        usage: {
          id: usage.id,
          patient_hn: usage.patient_hn ?? '',
          first_name: usage.first_name ?? '',
          lastname: usage.lastname ?? '',
          en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime != null ? new Date(usage.usage_datetime as any) : undefined,
        },
        items,
      };

      // Generate PDF
      const buffer = await this.comparisonReportPdfService.generateReport(reportData);
      const filename = `comparison_report_${usageId}_${new Date().toISOString().split('T')[0]}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment usage report in Excel format
   */
  async generateEquipmentUsageExcel(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      let items: any[] = [];

      // If usageIds provided, fetch those specific usages
      if (params.usageIds && params.usageIds.length > 0) {
        for (const usageId of params.usageIds) {
          const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
          const usage = await this.medicalSuppliesService.findOne(usageId);
          if (usageItems && usageItems.length > 0 && usage) {
            usageItems.forEach((item: any) => {
              items.push({
                en: usage.en,
                hn: usage.patient_hn,
                code: item.order_item_code || item.supply_code || '-',
                description: item.order_item_description || item.supply_name || '-',
                assessionNo: item.assession_no || '-',
                status: item.order_item_status || '-',
                qty: item.qty || 0,
                uom: item.uom || '-',
              });
            });
          }
        }
      } else {
        const queryParams: any = {};
        if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
        if (params.dateTo) queryParams.dateTo = params.dateTo;
        if (params.hospital) queryParams.hospital = params.hospital;
        if (params.department) queryParams.department = params.department;

        const findAllResult = await this.medicalSuppliesService.findAll({
          startDate: queryParams.dateFrom,
          endDate: queryParams.dateTo,
          department_code: queryParams.department,
          page: 1,
          limit: 10000,
        });

        if (findAllResult && findAllResult.data) {
          for (const usage of findAllResult.data) {
            const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
            if (usageItems && usageItems.length > 0) {
              usageItems.forEach((item: any) => {
                items.push({
                  en: usage.en,
                  hn: usage.patient_hn,
                  code: item.order_item_code || item.supply_code || '-',
                  description: item.order_item_description || item.supply_name || '-',
                  assessionNo: item.assession_no || '-',
                  status: item.order_item_status || '-',
                  qty: item.qty || 0,
                  uom: item.uom || '-',
                });
              });
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No items found for the specified criteria');
      }

      // Prepare report data
      const reportData: EquipmentUsageReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        items: items,
      };

      // Generate Excel
      const buffer = await this.equipmentUsageExcelService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_usage_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Usage Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Usage Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment usage report in PDF format
   */
  async generateEquipmentUsagePDF(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      let items: any[] = [];

      // If usageIds provided, fetch those specific usages
      if (params.usageIds && params.usageIds.length > 0) {
        for (const usageId of params.usageIds) {
          const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
          const usage = await this.medicalSuppliesService.findOne(usageId);
          if (usageItems && usageItems.length > 0 && usage) {
            usageItems.forEach((item: any) => {
              items.push({
                en: usage.en,
                hn: usage.patient_hn,
                code: item.order_item_code || item.supply_code || '-',
                description: item.order_item_description || item.supply_name || '-',
                assessionNo: item.assession_no || '-',
                status: item.order_item_status || '-',
                qty: item.qty || 0,
                uom: item.uom || '-',
              });
            });
          }
        }
      } else {
        const queryParams: any = {};
        if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
        if (params.dateTo) queryParams.dateTo = params.dateTo;
        if (params.hospital) queryParams.hospital = params.hospital;
        if (params.department) queryParams.department = params.department;

        const findAllResult = await this.medicalSuppliesService.findAll({
          startDate: queryParams.dateFrom,
          endDate: queryParams.dateTo,
          department_code: queryParams.department,
          page: 1,
          limit: 10000,
        });

        if (findAllResult && findAllResult.data) {
          for (const usage of findAllResult.data) {
            const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
            if (usageItems && usageItems.length > 0) {
              usageItems.forEach((item: any) => {
                items.push({
                  en: usage.en,
                  hn: usage.patient_hn,
                  code: item.order_item_code || item.supply_code || '-',
                  description: item.order_item_description || item.supply_name || '-',
                  assessionNo: item.assession_no || '-',
                  status: item.order_item_status || '-',
                  qty: item.qty || 0,
                  uom: item.uom || '-',
                });
              });
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No items found for the specified criteria');
      }

      // Prepare report data
      const reportData: EquipmentUsageReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        items: items,
      };

      // Generate PDF
      const buffer = await this.equipmentUsagePdfService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_usage_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Usage PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Usage PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment disbursement report in Excel format
   */
  async generateEquipmentDisbursementExcel(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      if (params.dateFrom) queryParams.startDate = params.dateFrom;
      if (params.dateTo) queryParams.endDate = params.dateTo;
      if (params.department) queryParams.department_code = params.department;
      queryParams.page = 1;
      queryParams.limit = 10000;

      const findAllResult = await this.medicalSuppliesService.findAll(queryParams);
      if (!findAllResult || !findAllResult.data) {
        throw new Error('Failed to fetch usage data');
      }

      const records: any[] = [];
      const summaryMap = new Map<string, { code: string; description: string; totalQty: number }>();

      for (const usage of findAllResult.data) {
        const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
        if (usageItems && usageItems.length > 0) {
          usageItems.forEach((item: any) => {
            const code = item.order_item_code || item.supply_code || '-';
            const description = item.order_item_description || item.supply_name || '-';
            const qty = item.qty || 0;

            let date = '';
            let time = '';
            if (usage.usage_datetime) {
              try {
                const dateTime = new Date(usage.usage_datetime);
                date = dateTime.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                time = dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                const parts = String(usage.usage_datetime).split(' ');
                if (parts.length >= 2) {
                  date = parts[0];
                  time = parts[1];
                } else {
                  date = String(usage.usage_datetime);
                  time = '';
                }
              }
            }

            records.push({
              code,
              description,
              date,
              time,
              recordedBy: usage.recorded_by_user_id || '-',
              qty,
            });

            const key = code;
            if (summaryMap.has(key)) {
              const existing = summaryMap.get(key)!;
              existing.totalQty += qty;
            } else {
              summaryMap.set(key, {
                code,
                description,
                totalQty: qty,
              });
            }
          });
        }
      }

      if (records.length === 0) {
        throw new Error('No records found for the specified criteria');
      }

      const reportData: EquipmentDisbursementReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        records,
        summary: Array.from(summaryMap.values()),
      };

      const buffer = await this.equipmentDisbursementExcelService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_disbursement_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Disbursement Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Disbursement Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment disbursement report in PDF format
   */
  async generateEquipmentDisbursementPDF(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      if (params.dateFrom) queryParams.startDate = params.dateFrom;
      if (params.dateTo) queryParams.endDate = params.dateTo;
      if (params.department) queryParams.department_code = params.department;
      queryParams.page = 1;
      queryParams.limit = 10000;

      const findAllResult = await this.medicalSuppliesService.findAll(queryParams);
      if (!findAllResult || !findAllResult.data) {
        throw new Error('Failed to fetch usage data');
      }

      const records: any[] = [];
      const summaryMap = new Map<string, { code: string; description: string; totalQty: number }>();

      for (const usage of findAllResult.data) {
        const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
        if (usageItems && usageItems.length > 0) {
          usageItems.forEach((item: any) => {
            const code = item.order_item_code || item.supply_code || '-';
            const description = item.order_item_description || item.supply_name || '-';
            const qty = item.qty || 0;

            // Parse usage_datetime
            let date = '';
            let time = '';
            if (usage.usage_datetime) {
              try {
                const dateTime = new Date(usage.usage_datetime);
                date = dateTime.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                time = dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                const parts = String(usage.usage_datetime).split(' ');
                if (parts.length >= 2) {
                  date = parts[0];
                  time = parts[1];
                } else {
                  date = String(usage.usage_datetime);
                  time = '';
                }
              }
            }

            records.push({
              code,
              description,
              date,
              time,
              recordedBy: usage.recorded_by_user_id || '-',
              qty,
            });

            const key = code;
            if (summaryMap.has(key)) {
              const existing = summaryMap.get(key)!;
              existing.totalQty += qty;
            } else {
              summaryMap.set(key, {
                code,
                description,
                totalQty: qty,
              });
            }
          });
        }
      }

      if (records.length === 0) {
        throw new Error('No records found for the specified criteria');
      }

      const reportData: EquipmentDisbursementReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        records,
        summary: Array.from(summaryMap.values()),
      };

      const buffer = await this.equipmentDisbursementPdfService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_disbursement_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Disbursement PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Disbursement PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate item comparison report in Excel format
   */
  async generateItemComparisonExcel(params: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    cabinetId?: string;
    includeUsageDetails?: boolean;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      // Use keyword instead of itemCode to match frontend API call
      if (params.itemCode) queryParams.keyword = params.itemCode;
      if (params.itemTypeId) queryParams.itemTypeId = params.itemTypeId;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.departmentCode) queryParams.departmentCode = params.departmentCode;
      if (params.subDepartmentId) queryParams.subDepartmentId = params.subDepartmentId;
      if (params.cabinetId) queryParams.cabinetId = params.cabinetId;

      const comparisonResult: any = await this.medicalSuppliesService.compareDispensedVsUsage(queryParams);
      let comparisonData: any[] = [];
      if (comparisonResult && comparisonResult.data) {
        comparisonData = Array.isArray(comparisonResult.data) ? comparisonResult.data : [];
      } else if (Array.isArray(comparisonResult)) {
        comparisonData = comparisonResult;
      }

      let deptNameForExcel: string | undefined;
      if (params.departmentCode) {
        const deptId = parseInt(params.departmentCode, 10);
        if (!Number.isNaN(deptId)) {
          const dept = await this.prisma.department.findUnique({
            where: { ID: deptId },
            select: { DepName: true },
          });
          deptNameForExcel = dept?.DepName ?? undefined;
        }
      }

      const paginationTotal = comparisonResult?.pagination?.total;
      const totalItemsCount =
        paginationTotal !== undefined && paginationTotal !== null
          ? Number(paginationTotal)
          : Number(comparisonResult?.summary?.total_items ?? comparisonData.length);

      const reportData: ItemComparisonReportData = {
        filters: {
          itemCode: params.itemCode,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentCode: params.departmentCode,
          departmentName: deptNameForExcel,
        },
        summary: {
          ...(comparisonResult?.summary || {
            total_dispensed: 0,
            total_used: 0,
            matched_count: 0,
            discrepancy_count: 0,
          }),
          total_items: totalItemsCount,
        },
        comparison: comparisonData.map((item: any) => ({
          ...item,
          usageItems: [],
        })),
      };

      // Fetch usage details for each item to include in excel
      const comparisonWithUsage = await Promise.all(
        comparisonData.map(async (item: any) => {
          try {
            const usageData = await this.medicalSuppliesService.getUsageByItemCodeFromItemTable({
              itemCode: item.itemcode,
              startDate: params.startDate,
              endDate: params.endDate,
              departmentCode: params.departmentCode,
              subDepartmentId: params.subDepartmentId,
              page: 1,
              limit: 100,
            });
            const usageItems = (usageData && (usageData as any).data) ? (usageData as any).data : (Array.isArray(usageData) ? usageData : []);
            return {
              ...item,
              usageItems,
            };
          } catch (error) {
            console.warn(`Failed to fetch usage details for ${item.itemcode}:`, error);
          }

          return item;
        })
      );

      reportData.comparison = comparisonWithUsage;

      // Generate Excel
      const buffer = await this.itemComparisonExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const itemCodeStr = params.itemCode ? `_${params.itemCode}` : '';
      const filename = `item_comparison_report${itemCodeStr}_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Item Comparison Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Comparison Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate item comparison report in PDF format
   */
  async generateItemComparisonPDF(params: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    cabinetId?: string;
    includeUsageDetails?: boolean;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      // Use keyword instead of itemCode to match frontend API call
      if (params.itemCode) queryParams.keyword = params.itemCode;
      if (params.itemTypeId) queryParams.itemTypeId = params.itemTypeId;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.departmentCode) queryParams.departmentCode = params.departmentCode;
      if (params.subDepartmentId) queryParams.subDepartmentId = params.subDepartmentId;
      if (params.cabinetId) queryParams.cabinetId = params.cabinetId;

      const comparisonResult: any = await this.medicalSuppliesService.compareDispensedVsUsage(queryParams);
      let comparisonData: any[] = [];
      if (comparisonResult && comparisonResult.data) {
        comparisonData = Array.isArray(comparisonResult.data) ? comparisonResult.data : [];
      } else if (Array.isArray(comparisonResult)) {
        comparisonData = comparisonResult;
      }

      let deptNameForPdf: string | undefined;
      if (params.departmentCode) {
        const deptId = parseInt(params.departmentCode, 10);
        if (!Number.isNaN(deptId)) {
          const dept = await this.prisma.department.findUnique({
            where: { ID: deptId },
            select: { DepName: true },
          });
          deptNameForPdf = dept?.DepName ?? undefined;
        }
      }

      const paginationTotalPdf = comparisonResult?.pagination?.total;
      const totalItemsCountPdf =
        paginationTotalPdf !== undefined && paginationTotalPdf !== null
          ? Number(paginationTotalPdf)
          : Number(comparisonResult?.summary?.total_items ?? comparisonData.length);

      const reportData: ItemComparisonReportData = {
        filters: {
          itemCode: params.itemCode,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentCode: params.departmentCode,
          departmentName: deptNameForPdf,
        },
        summary: {
          ...(comparisonResult?.summary || {
            total_dispensed: 0,
            total_used: 0,
            matched_count: 0,
            discrepancy_count: 0,
          }),
          total_items: totalItemsCountPdf,
        },
        comparison: comparisonData.map((item: any) => ({
          ...item,
          usageItems: [],
        })),
      };

      // Fetch usage details for each item to include in PDF
      const comparisonWithUsage = await Promise.all(
        comparisonData.map(async (item: any) => {
          try {
            const usageData = await this.medicalSuppliesService.getUsageByItemCodeFromItemTable({
              itemCode: item.itemcode,
              startDate: params.startDate,
              endDate: params.endDate,
              departmentCode: params.departmentCode,
              subDepartmentId: params.subDepartmentId,
              page: 1,
              limit: 100,
            });
            const usageItems = (usageData && (usageData as any).data) ? (usageData as any).data : (Array.isArray(usageData) ? usageData : []);
            return {
              ...item,
              usageItems,
            };
          } catch (error) {
            console.warn(`Failed to fetch usage details for ${item.itemcode}:`, error);
          }

          return item;
        })
      );

      reportData.comparison = comparisonWithUsage;

      // Generate PDF
      const buffer = await this.itemComparisonPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const itemCodeStr = params.itemCode ? `_${params.itemCode}` : '';
      const filename = `item_comparison_report${itemCodeStr}_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Item Comparison PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Comparison PDF report: ${errorMessage}`);
    }
  }

  /**
   * Report 1: Generate Vending Mapping Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateVendingMappingExcel(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const whereConditions: any = {
        print_date: { not: null },
      };

      if (params?.printDate) {
        whereConditions.print_date = params.printDate;
      } else if (params?.startDate || params?.endDate) {
        whereConditions.print_date = {
          not: null,
        };
        if (params?.startDate) {
          whereConditions.print_date.gte = params.startDate;
        }
        if (params?.endDate) {
          whereConditions.print_date.lte = params.endDate;
        }
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
              AND DATE(ist.LastCabinetModify) = DATE(${new Date(printDate)})
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      const reportData = {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };

      const buffer = await this.vendingMappingReportExcelService.generateReport(reportData);
      const dateStr = params.printDate || params.startDate || new Date().toISOString().split('T')[0];
      const filename = `vending_mapping_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Vending Mapping Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Vending Mapping Excel report: ${errorMessage}`);
    }
  }

  /**
   * Report 1: Generate Vending Mapping Report (PDF)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateVendingMappingPDF(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const whereConditions: any = {
        print_date: { not: null },
      };

      if (params?.printDate) {
        whereConditions.print_date = params.printDate;
      } else if (params?.startDate || params?.endDate) {
        whereConditions.print_date = {
          not: null,
        };
        if (params?.startDate) {
          whereConditions.print_date.gte = params.startDate;
        }
        if (params?.endDate) {
          whereConditions.print_date.lte = params.endDate;
        }
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
              AND DATE(ist.LastCabinetModify) = DATE(${new Date(printDate)})
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      const reportData = {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };

      const buffer = await this.vendingMappingReportPdfService.generateReport(reportData);
      const dateStr = params.printDate || params.startDate || new Date().toISOString().split('T')[0];
      const filename = `vending_mapping_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Vending Mapping PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Vending Mapping PDF report: ${errorMessage}`);
    }
  }

  /**
   * Report 2: Generate Unmapped Dispensed Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateUnmappedDispensedExcel(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const groupBy = params.groupBy || 'day';

      let whereClause = Prisma.sql`ist.StockID = 0 AND ist.RfidCode <> ''`;

      if (params?.startDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) >= DATE(${new Date(params.startDate)})`;
      }
      if (params?.endDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) <= DATE(${new Date(params.endDate)})`;
      }

      const dateFormat = groupBy === 'day'
        ? Prisma.sql`DATE(ist.LastCabinetModify)`
        : Prisma.sql`DATE_FORMAT(ist.LastCabinetModify, '%Y-%m')`;

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode,
          ${dateFormat} as group_date
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC
      `;

      const reportByDate = new Map<string, any>();

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;
        const dispensedDate = dispensed.LastCabinetModify;
        const groupDate = dispensed.group_date;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: new Date(new Date(dispensedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(dispensedDate).setHours(23, 59, 59, 999)),
            },
          },
        });

        if (!usageRecord) {
          if (!reportByDate.has(groupDate)) {
            reportByDate.set(groupDate, {
              date: groupDate,
              items: [],
              total_qty: 0,
            });
          }

          const report = reportByDate.get(groupDate);
          report.items.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensedDate,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
          });
          report.total_qty += Number(dispensed.Qty);
        }
      }

      const result = Array.from(reportByDate.values());

      const reportData = {
        filters: params,
        summary: {
          total_periods: result.length,
          total_unmapped_items: result.reduce((sum, r) => sum + r.items.length, 0),
          total_unmapped_qty: result.reduce((sum, r) => sum + r.total_qty, 0),
        },
        groupBy,
        data: result,
      };

      const buffer = await this.unmappedDispensedReportExcelService.generateReport(reportData);
      const dateStr = params.startDate || new Date().toISOString().split('T')[0];
      const groupByStr = params.groupBy || 'day';
      const filename = `unmapped_dispensed_report_${groupByStr}_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Unmapped Dispensed Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Unmapped Dispensed Excel report: ${errorMessage}`);
    }
  }

  /**
   * Report 3: Generate Unused Dispensed Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateUnusedDispensedExcel(params: {
    date?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const targetDate = params?.date
        ? new Date(params.date)
        : new Date();

      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ist.StockID = 0
          AND ist.RfidCode <> ''
          AND DATE(ist.LastCabinetModify) = DATE(${startOfDay})
        ORDER BY ist.LastCabinetModify DESC
      `;

      const unusedItems: any[] = [];

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (!usageRecord) {
          unusedItems.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensed.LastCabinetModify,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
            hours_since_dispense: Math.floor(
              (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
            ),
          });
        }
      }

      const reportData = {
        summary: {
          date: targetDate.toISOString().split('T')[0],
          total_unused_items: unusedItems.length,
          total_unused_qty: unusedItems.reduce((sum, item) => sum + item.qty, 0),
        },
        data: unusedItems,
      };

      const buffer = await this.unusedDispensedReportExcelService.generateReport(reportData);
      const dateStr = params.date || new Date().toISOString().split('T')[0];
      const filename = `unused_dispensed_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Unused Dispensed Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Unused Dispensed Excel report: ${errorMessage}`);
    }
  }

  /**
   * Get Vending Mapping Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getVendingMappingData(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<any> {
    try {
      const whereConditions: any = {};

      if (params?.printDate) {
        // whereConditions.print_date = params.printDate;
        whereConditions.print_date = params.startDate
      }

      if (params?.startDate && params?.endDate) {
        whereConditions.created_at = {
          gte: new Date(params.startDate + 'T00:00:00.000Z'),
          lte: new Date(params.endDate + 'T23:59:59.999Z'),
        };
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
           
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      return {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Vending Mapping data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Vending Mapping data: ${errorMessage}`);
    }
  }

  /**
   * Get Unmapped Dispensed Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getUnmappedDispensedData(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }): Promise<any> {
    try {
      const groupBy = params.groupBy || 'day';

      let whereClause = Prisma.sql`ist.StockID = 0 AND ist.RfidCode <> ''`;

      if (params?.startDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) >= DATE(${new Date(params.startDate)})`;
      }
      if (params?.endDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) <= DATE(${new Date(params.endDate)})`;
      }

      const dateFormat = groupBy === 'day'
        ? Prisma.sql`DATE(ist.LastCabinetModify)`
        : Prisma.sql`DATE_FORMAT(ist.LastCabinetModify, '%Y-%m')`;

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode,
          ${dateFormat} as group_date
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC
      `;

      const reportByDate = new Map<string, any>();

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;
        const dispensedDate = dispensed.LastCabinetModify;
        const groupDate = dispensed.group_date;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: new Date(new Date(dispensedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(dispensedDate).setHours(23, 59, 59, 999)),
            },
          },
        });

        if (!usageRecord) {
          if (!reportByDate.has(groupDate)) {
            reportByDate.set(groupDate, {
              date: groupDate,
              items: [],
              total_qty: 0,
            });
          }

          const report = reportByDate.get(groupDate);
          report.items.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensedDate,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
          });
          report.total_qty += Number(dispensed.Qty);
        }
      }

      const result = Array.from(reportByDate.values());

      return {
        filters: params,
        summary: {
          total_periods: result.length,
          total_unmapped_items: result.reduce((sum, r) => sum + r.items.length, 0),
          total_unmapped_qty: result.reduce((sum, r) => sum + r.total_qty, 0),
        },
        groupBy,
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Unmapped Dispensed data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Unmapped Dispensed data: ${errorMessage}`);
    }
  }

  /**
   * Get Unused Dispensed Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getUnusedDispensedData(params: {
    date?: string;
  }): Promise<any> {
    try {
      const targetDate = params?.date
        ? new Date(params.date)
        : new Date();

      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ist.StockID = 0
          AND ist.RfidCode <> ''
          AND DATE(ist.LastCabinetModify) = DATE(${startOfDay})
        ORDER BY ist.LastCabinetModify DESC
      `;

      const unusedItems: any[] = [];

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            supply_items: {
              where: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
          },
        });

        if (!usageRecord) {
          unusedItems.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensed.LastCabinetModify,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
            hours_since_dispense: Math.floor(
              (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
            ),
            supply_usage_item_id: null,
          });
        } else {
          // Find matching supply item that can be returned
          const matchingItem = usageRecord.supply_items.find((item: any) => {
            const availableQty = item.qty - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0);
            return availableQty > 0;
          });

          if (matchingItem) {
            const availableQty = matchingItem.qty || 0 - (matchingItem.qty_used_with_patient || 0) - (matchingItem.qty_returned_to_cabinet || 0);
            unusedItems.push({
              item_code: itemCode,
              item_name: dispensed.itemname,
              dispensed_date: dispensed.LastCabinetModify,
              qty: Number(dispensed.Qty),
              rfid_code: dispensed.RfidCode,
              hours_since_dispense: Math.floor(
                (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
              ),
              supply_usage_item_id: matchingItem.id,
              available_qty: availableQty,
            });
          }
        }
      }

      return {
        summary: {
          date: targetDate.toISOString().split('T')[0],
          total_unused_items: unusedItems.length,
          total_unused_qty: unusedItems.reduce((sum, item) => sum + item.qty, 0),
        },
        data: unusedItems,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Unused Dispensed data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Unused Dispensed data: ${errorMessage}`);
    }
  }

  /**
   * Get Cancel Bill Report Data (JSON)
   * ดึงข้อมูลรายการที่ยกเลิก Bill จาก MedicalSupplyUsage
   */
  async getCancelBillReportData(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const whereConditions: any = {
        billing_status: 'CANCELLED',
      };

      if (params?.startDate || params?.endDate) {
        whereConditions.created_at = {};
        if (params?.startDate) {
          whereConditions.created_at.gte = new Date(params.startDate);
        }
        if (params?.endDate) {
          whereConditions.created_at.lte = new Date(params.endDate);
        }
      }

      const cancelledRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: {
            where: {
              order_item_status: 'Discontinue',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const result = cancelledRecords.map(record => ({
        id: record.id,
        en: record.en,
        patient_hn: record.patient_hn,
        patient_name: `${record.first_name || ''} ${record.lastname || ''}`.trim() || record.patient_name_th || '-',
        print_date: record.print_date,
        created_at: record.created_at,
        billing_status: record.billing_status,
        cancelled_items: record.supply_items.map(item => ({
          item_code: item.order_item_code || item.supply_code,
          item_name: item.order_item_description || item.supply_name,
          assession_no: item.assession_no,
          qty: item.qty,
          qty_used_with_patient: item.qty_used_with_patient,
          order_item_status: item.order_item_status,
        })),
      }));

      return {
        filters: params,
        summary: {
          total_cancelled_bills: result.length,
          total_cancelled_items: result.reduce((sum, r) => sum + r.cancelled_items.length, 0),
        },
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Cancel Bill data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Cancel Bill data: ${errorMessage}`);
    }
  }

  /**
   * Get Return Report Data (JSON)
   * ดึงข้อมูลการคืนเวชภัณฑ์จาก medical-supplies-service
   */
  async getReturnReportData(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const result: any = await this.medicalSuppliesService.getReturnHistory(params as any);

      const data = (result && result.data) ? result.data : (result && Array.isArray(result) ? result : []);
      const total = (result && result.total != null) ? result.total : data.length;
      const page = (result && result.page != null) ? result.page : 1;
      const limit = (result && result.limit != null) ? result.limit : 10;

      return {
        data: Array.isArray(data) ? data : [],
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Return Report data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Return Report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Return Report in Excel format
   */
  async generateReturnReportExcel(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<Buffer> {
    try {
      // Get return history data from medical-supplies-service
      const returnData = await this.getReturnReportData({
        ...params,
        page: 1,
        limit: 10000, // Get all records for report
      });

      // Prepare report data
      const reportData: ReturnReportData = {
        filters: {
          date_from: params.date_from,
          date_to: params.date_to,
          return_reason: params.return_reason,
          department_code: params.department_code,
          patient_hn: params.patient_hn,
        },
        summary: {
          total_records: returnData.total || returnData.data?.length || 0,
          total_qty_returned: returnData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty_returned || 0),
            0
          ) || 0,
        },
        data: returnData.data || [],
      };

      // Generate Excel report
      const buffer = await this.returnReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Return Report Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Return Report in PDF format
   */
  async generateReturnReportPdf(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<Buffer> {
    try {
      // Get return history data from medical-supplies-service
      const returnData = await this.getReturnReportData({
        ...params,
        page: 1,
        limit: 10000, // Get all records for report
      });

      // Prepare report data
      const reportData: ReturnReportData = {
        filters: {
          date_from: params.date_from,
          date_to: params.date_to,
          return_reason: params.return_reason,
          department_code: params.department_code,
          patient_hn: params.patient_hn,
        },
        summary: {
          total_records: returnData.total || returnData.data?.length || 0,
          total_qty_returned: returnData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty_returned || 0),
            0
          ) || 0,
        },
        data: returnData.data || [],
      };

      // Generate PDF report
      const buffer = await this.returnReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Return Report PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return Report PDF: ${errorMessage}`);
    }
  }

  /**
   * Generate Cancel Bill Report in Excel format
   */
  async generateCancelBillReportExcel(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    try {
      // Get cancel bill data
      const cancelBillData = await this.getCancelBillReportData(params);

      // Prepare report data
      const reportData: CancelBillReportData = {
        filters: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
        summary: {
          total_cancelled_bills: cancelBillData.summary?.total_cancelled_bills || 0,
          total_cancelled_items: cancelBillData.summary?.total_cancelled_items || 0,
        },
        data: cancelBillData.data || [],
      };

      // Generate Excel report
      const buffer = await this.cancelBillReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Cancel Bill Report Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cancel Bill Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Cancel Bill Report in PDF format
   */
  async generateCancelBillReportPdf(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    try {
      // Get cancel bill data
      const cancelBillData = await this.getCancelBillReportData(params);

      // Prepare report data
      const reportData: CancelBillReportData = {
        filters: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
        summary: {
          total_cancelled_bills: cancelBillData.summary?.total_cancelled_bills || 0,
          total_cancelled_items: cancelBillData.summary?.total_cancelled_items || 0,
        },
        data: cancelBillData.data || [],
      };

      // Generate PDF report
      const buffer = await this.cancelBillReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Cancel Bill Report PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cancel Bill Report PDF: ${errorMessage}`);
    }
  }

  /**
   * Get Returned Items Data (StockID = 1) for report
   */
  async getReturnToCabinetReportData(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const batchLimit = 5000;
      const aggregated: any[] = [];
      let reportedTotal = 0;
      let page = 1;

      while (true) {
        const result: any = await this.medicalSuppliesService.getReturnedItems({
          keyword: params.keyword,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          subDepartmentId: params.subDepartmentId,
          page,
          limit: batchLimit,
        });

        const batch = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
        if (!Array.isArray(batch)) {
          break;
        }

        reportedTotal =
          result?.total != null ? Number(result.total) : aggregated.length + batch.length;
        aggregated.push(...batch);

        if (batch.length < batchLimit || aggregated.length >= reportedTotal) {
          break;
        }
        page += 1;
        if (page > 500) {
          console.warn('[Report Service] return-to-cabinet: stopped batch fetch after 500 pages');
          break;
        }
      }

      return {
        data: aggregated,
        total: reportedTotal,
        page: 1,
        limit: aggregated.length,
      };
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Return To Cabinet Report data: ${errorMessage}`);
    }
  }

  private buildReturnToCabinetReportData(
    returnedData: { data: any[]; total: number },
    params: {
      keyword?: string;
      itemTypeId?: number;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      cabinetId?: string;
    },
    labels: { cabinetName?: string; departmentName?: string },
  ): ReturnToCabinetReportData {
    const rawData = returnedData.data || [];
    const groups = buildReturnedGroups(rawData);
    return {
      filters: {
        keyword: params.keyword,
        itemTypeId: params.itemTypeId,
        startDate: params.startDate,
        endDate: params.endDate,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
        departmentName: labels.departmentName,
        cabinetName: labels.cabinetName,
      },
      summary: {
        total_records: returnedData.total || rawData.length,
        total_qty: rawData.reduce((sum: number, record: any) => sum + (record.qty || 0), 0) || 0,
      },
      data: rawData,
      groups: groups.length > 0 ? groups : undefined,
    };
  }

  /**
   * Generate Return To Cabinet Report in Excel format
   */
  async generateReturnToCabinetReportExcel(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<Buffer> {
    try {
      const returnedData = await this.getReturnToCabinetReportData(params);

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);
      const reportData = this.buildReturnToCabinetReportData(returnedData, params, labels);

      const buffer = await this.returnToCabinetReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return To Cabinet Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Return To Cabinet Report in PDF format
   */
  async generateReturnToCabinetReportPdf(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<Buffer> {
    try {
      const returnedData = await this.getReturnToCabinetReportData(params);

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);
      const reportData = this.buildReturnToCabinetReportData(returnedData, params, labels);

      const buffer = await this.returnToCabinetReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return To Cabinet Report PDF: ${errorMessage}`);
    }
  }

  /**
   * ดึงชื่อแผนกและชื่อตู้ — cabinetId ว่าง = ตู้ทั้งหมด, departmentId ว่าง = แผนกทั้งหมด
   */
  private async getCabinetDepartmentLabels(
    cabinetId?: string,
    departmentId?: string,
  ): Promise<{ cabinetName?: string; departmentName?: string }> {
    const hasCab = cabinetId != null && String(cabinetId).trim() !== '';
    const hasDept = departmentId != null && String(departmentId).trim() !== '';
    if (!hasCab && !hasDept) return {};

    try {
      let cabinetName: string | undefined;
      let departmentName: string | undefined;

      if (hasCab && hasDept) {
        const cabId = parseInt(String(cabinetId).trim(), 10);
        const deptId = parseInt(String(departmentId).trim(), 10);
        if (Number.isNaN(cabId) || Number.isNaN(deptId)) return {};
        // ไม่ใช้ include เพื่อหลีกเลี่ยง error กับคอลัมน์ IsCancel ใน Department
        const cd = await this.prisma.cabinetDepartment.findFirst({
          where: { cabinet_id: cabId, department_id: deptId },
          select: { cabinet_id: true, department_id: true },
        });
        if (cd?.cabinet_id != null && cd?.department_id != null) {
          const [cabinet, department] = await Promise.all([
            this.prisma.cabinet.findUnique({ where: { id: cd.cabinet_id }, select: { cabinet_name: true } }),
            this.prisma.department.findUnique({ where: { ID: cd.department_id }, select: { DepName: true } }),
          ]);
          cabinetName = cabinet?.cabinet_name ?? undefined;
          departmentName = department?.DepName ?? undefined;
        }
      } else if (hasCab) {
        const cabId = parseInt(String(cabinetId).trim(), 10);
        if (Number.isNaN(cabId)) return {};
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabId },
          select: { cabinet_name: true },
        });
        cabinetName = cabinet?.cabinet_name ?? undefined;
      } else {
        // only departmentId
        const deptId = parseInt(String(departmentId).trim(), 10);
        if (Number.isNaN(deptId)) return {};
        const department = await this.prisma.department.findUnique({
          where: { ID: deptId },
          select: { DepName: true },
        });
        departmentName = department?.DepName ?? undefined;
      }

      // Fallback: ถ้ามี departmentId แต่ยังไม่มีชื่อแผนก ให้ดึงจากตาราง Department โดยตรง
      if (hasDept && departmentName == null) {
        const deptId = parseInt(String(departmentId).trim(), 10);
        if (!Number.isNaN(deptId)) {
          const department = await this.prisma.department.findUnique({
            where: { ID: deptId },
            select: { DepName: true },
          });
          departmentName = department?.DepName ?? undefined;
        }
      }
      if (hasCab && cabinetName == null) {
        const cabId = parseInt(String(cabinetId).trim(), 10);
        if (!Number.isNaN(cabId)) {
          const cabinet = await this.prisma.cabinet.findUnique({
            where: { id: cabId },
            select: { cabinet_name: true },
          });
          cabinetName = cabinet?.cabinet_name ?? undefined;
        }
      }

      return { cabinetName, departmentName };
    } catch {
      return {};
    }
  }

  /**
   * Generate Dispensed Items Report in Excel format
   */
  async generateDispensedItemsExcel(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const result: any = await this.medicalSuppliesService.getDispensedItems({
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page || 1,
        limit: params.limit || 10000,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
        subDepartmentId: params.subDepartmentId,
      });

      const dispensedItems = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (!Array.isArray(dispensedItems)) {
        throw new Error('Failed to fetch dispensed items data');
      }

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      const sortedItems = sortDispensedItemsForReport(dispensedItems);
      const summaryQty = sortedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      const groups = buildDispensedGroups(sortedItems);

      const reportData: DispensedItemsReportData = {
        filters: {
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        } as DispensedItemsReportData['filters'],
        summary: {
          total_records: result?.total ?? sortedItems.length,
          total_qty: summaryQty,
        },
        data: sortedItems,
        groups: groups.length > 0 ? groups : undefined,
      };

      // Generate Excel report
      const buffer = await this.dispensedItemsExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items Report in PDF format
   */
  async generateDispensedItemsPDF(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    subDepartmentId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const result: any = await this.medicalSuppliesService.getDispensedItems({
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page || 1,
        limit: params.limit || 10000,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
        subDepartmentId: params.subDepartmentId,
      });

      const dispensedItems = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (!Array.isArray(dispensedItems)) {
        throw new Error('Failed to fetch dispensed items data');
      }

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      const sortedItems = sortDispensedItemsForReport(dispensedItems);
      const summaryQty = sortedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      const groups = buildDispensedGroups(sortedItems);

      const reportData: DispensedItemsReportData = {
        filters: {
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        } as DispensedItemsReportData['filters'],
        summary: {
          total_records: result?.total ?? sortedItems.length,
          total_qty: summaryQty,
        },
        data: sortedItems,
        groups: groups.length > 0 ? groups : undefined,
      };

      // Generate PDF report
      const buffer = await this.dispensedItemsPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items PDF report: ${errorMessage}`);
    }
  }

  /**
   * Get Cabinet Stock Report Data (สต๊อกอุปกรณ์ในตู้)
   * คอลัมน์: ลำดับ, แผนก, รหัสอุปกรณ์, อุปกรณ์, คงเหลือ, Stock Max, Stock Min, จำนวนที่ต้องเติม
   * คงเหลือ = จำนวนชิ้นในตู้ (นับเฉพาะ itemstock ที่ IsStock = 1 เท่านั้น)
   * จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้ (ไม่ติดลบ; Max จาก CabinetItemSetting)
   * รายงาน Excel/PDF: แสดงทุกรายการตาม filter (เหมือนหน้าเว็บ) — เรียงหมดอายุ/ใกล้หมดอายุ/ต่ำกว่า Min ก่อน
   */
  async getCabinetStockData(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    /** YYYY-MM-DD = วันที่อ้างอิง (รายงานจากหน้าเว็บใช้วันนี้; archive อาจส่งวันอื่น) */
    asOfDate?: string;
  }): Promise<CabinetStockReportData> {
    try {
      const rawAsOf = params?.asOfDate?.trim();
      const asOfIso = rawAsOf && /^\d{4}-\d{2}-\d{2}$/.test(rawAsOf) ? rawAsOf : undefined;
      const todayIso = this.cabinetReportDateISO();
      if (asOfIso && asOfIso !== todayIso) {
        console.warn(
          `[Report Service] Cabinet stock asOfDate=${asOfIso} — ใช้ logic หน้าเว็บ (วันนี้) สำหรับ qty ถูกใช้งาน/ชำรุด`,
        );
      }

      let cabinetId = params?.cabinetId;
      if (!isValidCabinetFilterId(cabinetId) && params?.cabinetCode) {
        const cab = await this.prisma.cabinet.findFirst({
          where: { cabinet_code: params.cabinetCode },
          select: { id: true },
        });
        cabinetId = isValidCabinetFilterId(cab?.id) ? cab.id : undefined;
      } else if (!isValidCabinetFilterId(cabinetId)) {
        cabinetId = undefined;
      }

      // ใช้ ItemService.findAllItems — logic เดียวกับหน้า /admin/items และ /staff/items
      const listResult = await this.itemService.findAllItems(
        1,
        500_000,
        undefined,
        'itemcode',
        'asc',
        cabinetId,
        params?.departmentId,
      );

      if (!('data' in listResult)) {
        throw new Error(
          ('message' in listResult && listResult.message) || 'Failed to fetch cabinet stock items',
        );
      }

      const items = (listResult.data ?? []) as Array<{
        itemcode: string;
        itemname?: string | null;
        count_itemstock?: number;
        qty_in_use?: number;
        damaged_qty?: number;
        stock_min?: number | null;
        stock_max?: number | null;
        refill_qty?: number;
        SubUnitQty?: number | null;
        unit?: { UnitName?: string | null };
        subUnit?: { UnitName?: string | null };
        itemStocks?: Array<{
          ExpireDate?: Date | string | null;
          IsStock?: boolean | number | null;
          cabinet?: {
            cabinetDepartments?: Array<{
              department?: { DepName?: string | null; DepName2?: string | null };
            }>;
          };
        }>;
        department?: { DepName?: string | null; DepName2?: string | null };
      }>;

      const data: CabinetStockReportData['data'] = items.map((item, idx) => ({
        seq: idx + 1,
        department_name: this.resolveItemDepartmentNameForReport(item),
        item_code: item.itemcode,
        item_name: item.itemname ?? '-',
        balance_qty: Number(item.count_itemstock ?? 0),
        qty_in_use: Number(item.qty_in_use ?? 0),
        damaged_qty: Number(item.damaged_qty ?? 0),
        stock_max: item.stock_max ?? null,
        stock_min: item.stock_min ?? null,
        refill_qty: Number(item.refill_qty ?? 0),
        has_expired: this.itemHasExpiredStock(item),
        has_near_expiry: this.itemHasNearExpiryStock(item),
        unit:
          item.unit?.UnitName != null && String(item.unit.UnitName).trim() !== ''
            ? { UnitName: String(item.unit.UnitName).trim() }
            : undefined,
        subUnit:
          item.subUnit?.UnitName != null && String(item.subUnit.UnitName).trim() !== ''
            ? { UnitName: String(item.subUnit.UnitName).trim() }
            : undefined,
        SubUnitQty: item.SubUnitQty != null ? Number(item.SubUnitQty) : undefined,
      }));

      const totalQtyReport = data.reduce((s, r) => s + Number(r.balance_qty ?? 0), 0);
      const totalRefillReport = data.reduce((s, r) => s + Number(r.refill_qty ?? 0), 0);

      let filterDeptName: string | undefined;
      let filterCabinetName: string | undefined;
      if (params?.departmentId != null) {
        const dept = await this.prisma.department.findUnique({
          where: { ID: params.departmentId },
          select: { DepName: true },
        });
        filterDeptName = dept?.DepName ?? undefined;
      }
      if (cabinetId != null) {
        const cab = await this.prisma.cabinet.findUnique({
          where: { id: cabinetId },
          select: { cabinet_name: true, cabinet_code: true },
        });
        filterCabinetName = cab?.cabinet_name ?? cab?.cabinet_code ?? undefined;
      } else if (params?.cabinetCode) {
        filterCabinetName = params.cabinetCode;
      }

      return {
        reportDateDisplay: this.formatCabinetReportDateDisplay(asOfIso),
        reportDateISO: this.cabinetReportDateISO(asOfIso),
        showRowHighlight: isValidCabinetFilterId(cabinetId),
        filters: {
          cabinetId,
          cabinetCode: params?.cabinetCode,
          cabinetName: filterCabinetName,
          departmentId: params?.departmentId,
          departmentName: filterDeptName,
        },
        summary: {
          total_rows: data.length,
          total_qty: totalQtyReport,
          total_refill_qty: totalRefillReport,
        },
        data,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Cabinet Stock data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Cabinet Stock report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Cabinet Stock Report (สต๊อกอุปกรณ์ในตู้) - Excel
   */
  async generateCabinetStockExcel(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    asOfDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetStockData(params);
      const buffer = await this.cabinetStockReportExcelService.generateReport(reportData);
      const dateStr = reportData.reportDateISO ?? new Date().toISOString().split('T')[0];
      const filename = `cabinet_stock_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Stock Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Stock Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Cabinet Stock Report (สต๊อกอุปกรณ์ในตู้) - PDF
   */
  async generateCabinetStockPdf(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    asOfDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetStockData(params);
      const buffer = await this.cabinetStockReportPdfService.generateReport(reportData);
      const dateStr = reportData.reportDateISO ?? new Date().toISOString().split('T')[0];
      const filename = `cabinet_stock_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Stock PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Stock PDF report: ${errorMessage}`);
    }
  }

  /**
   * Get Cabinet Departments report data (จัดการตู้ Cabinet - แผนก) for Excel/PDF
   */
  async getCabinetDepartmentsReportData(params: {
    cabinetId?: number;
    departmentId?: number;
    status?: string;
  }): Promise<CabinetDepartmentsReportData> {
    const where: any = {};
    if (params?.cabinetId != null) where.cabinet_id = params.cabinetId;
    if (params?.departmentId != null) where.department_id = params.departmentId;
    if (params?.status != null && params.status !== '' && params.status !== 'ALL') where.status = params.status;

    const mappings = await this.prisma.cabinetDepartment.findMany({
      where,
      include: {
        department: { select: { ID: true, DepName: true } },
        cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true, stock_id: true } },
      },
      orderBy: { cabinet_id: 'asc' },
    });

    const mappingsWithCount = await Promise.all(
      mappings.map(async (m) => {
        const stockId = (m.cabinet as { stock_id?: number })?.stock_id;
        let itemstock_count = 0;
        let itemstock_dispensed_count = 0;
        if (stockId) {
          [itemstock_count, itemstock_dispensed_count] = await Promise.all([
            this.prisma.itemStock.count({ where: { StockID: stockId, IsStock: true } }),
            this.prisma.itemStock.count({ where: { StockID: stockId, IsStock: false } }),
          ]);
        }
        return {
          ...m,
          itemstock_count,
          itemstock_dispensed_count,
        };
      }),
    );

    const cabinetName =
      params?.cabinetId != null
        ? (mappingsWithCount[0]?.cabinet as { cabinet_name?: string })?.cabinet_name ?? undefined
        : undefined;
    const departmentName =
      params?.departmentId != null
        ? (mappingsWithCount[0]?.department as { DepName?: string })?.DepName ?? undefined
        : undefined;
    const statusLabel =
      params?.status && params.status !== 'ALL' ? (params.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน') : undefined;

    const data = await Promise.all(
      mappingsWithCount.map(async (m, idx) => {
        const stockId = (m.cabinet as { stock_id?: number })?.stock_id;
        let subRows: CabinetDepartmentsSubRow[] = [];
        if (stockId) {
          const stocks = await this.prisma.itemStock.findMany({
            where: { StockID: stockId },
            select: {
              ItemCode: true,
              Qty: true,
              IsStock: true,
              item: { select: { itemcode: true, itemname: true } },
            },
          });
          const grouped = new Map<
            string,
            { itemcode: string; itemname: string; inStockCount: number; dispensedCount: number; totalQty: number }
          >();
          for (const s of stocks) {
            const code = (s.item as { itemcode?: string })?.itemcode ?? s.ItemCode ?? '-';
            const name = (s.item as { itemname?: string })?.itemname ?? '-';
            if (!grouped.has(code)) {
              grouped.set(code, { itemcode: code, itemname: name, inStockCount: 0, dispensedCount: 0, totalQty: 0 });
            }
            const g = grouped.get(code)!;
            g.totalQty += Number(s.Qty) || 0;
            const isStock = s.IsStock === true || (typeof s.IsStock === 'number' && s.IsStock === 1);
            if (isStock) g.inStockCount += 1;
            else g.dispensedCount += 1;
          }
          subRows = Array.from(grouped.values())
            .sort((a, b) => a.itemcode.localeCompare(b.itemcode))
            .map((g, i) => ({
              seq: i + 1,
              itemcode: g.itemcode,
              itemname: g.itemname,
              inStockCount: g.inStockCount,
              dispensedCount: g.dispensedCount,
              totalQty: g.totalQty,
            }));

          // Fallback: ถ้า ItemStock ว่าง แต่ตู้มี stock_id ให้ดึงจาก ItemSlotInCabinet (รายการในตู้แบบ slot)
          if (subRows.length === 0) {
            const slots = await this.prisma.itemSlotInCabinet.findMany({
              where: { StockID: stockId },
              select: { itemcode: true, Qty: true, item: { select: { itemcode: true, itemname: true } } },
            });
            const slotGrouped = new Map<
              string,
              { itemcode: string; itemname: string; inStockCount: number; dispensedCount: number; totalQty: number }
            >();
            for (const slot of slots) {
              const code = (slot.item as { itemcode?: string })?.itemcode ?? slot.itemcode ?? '-';
              const name = (slot.item as { itemname?: string })?.itemname ?? '-';
              if (!slotGrouped.has(code)) {
                slotGrouped.set(code, { itemcode: code, itemname: name, inStockCount: 0, dispensedCount: 0, totalQty: 0 });
              }
              const g = slotGrouped.get(code)!;
              g.totalQty += Number(slot.Qty) || 0;
            }
            subRows = Array.from(slotGrouped.values())
              .sort((a, b) => a.itemcode.localeCompare(b.itemcode))
              .map((g, i) => ({
                seq: i + 1,
                itemcode: g.itemcode,
                itemname: g.itemname,
                inStockCount: g.inStockCount,
                dispensedCount: g.dispensedCount,
                totalQty: g.totalQty,
              }));
          }
        }
        return {
          seq: idx + 1,
          cabinet_name: (m.cabinet as { cabinet_name?: string })?.cabinet_name ?? '-',
          department_name: (m.department as { DepName?: string })?.DepName ?? '-',
          quantity_display: `${(m as { itemstock_dispensed_count?: number }).itemstock_dispensed_count ?? 0} / ${(m as { itemstock_count?: number }).itemstock_count ?? 0}`,
          status: (m as { status?: string }).status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน',
          description: (m as { description?: string })?.description ?? '-',
          subRows,
        };
      }),
    );

    return {
      filters: {
        cabinetName: cabinetName ?? (params?.cabinetId != null ? String(params.cabinetId) : undefined),
        departmentName: departmentName ?? (params?.departmentId != null ? String(params.departmentId) : undefined),
        status: statusLabel ?? (params?.status && params.status !== 'ALL' ? params.status : undefined),
      },
      summary: { total_records: data.length },
      data,
    };
  }

  /**
   * Generate Cabinet Departments Report (จัดการตู้ Cabinet - แผนก) - Excel
   */
  async generateCabinetDepartmentsExcel(params: {
    cabinetId?: number;
    departmentId?: number;
    status?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetDepartmentsReportData(params);
      const buffer = await this.cabinetDepartmentsReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `cabinet_departments_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Departments Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Departments Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Cabinet Departments Report (จัดการตู้ Cabinet - แผนก) - PDF
   */
  async generateCabinetDepartmentsPdf(params: {
    cabinetId?: number;
    departmentId?: number;
    status?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetDepartmentsReportData(params);
      const buffer = await this.cabinetDepartmentsReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `cabinet_departments_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Departments PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Departments PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Dispense Report (รายการเบิกตู้ Weighing) - Excel
   */
  async generateWeighingDispenseExcel(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('-', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const formatDate = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        const sec = String(date.getUTCSeconds()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}:${sec}`;
      };
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: formatDate(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingDispenseReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_dispense_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Dispense Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Dispense Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Dispense Report (รายการเบิกตู้ Weighing) - PDF
   */
  async generateWeighingDispensePdf(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('-', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const formatDate = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        const sec = String(date.getUTCSeconds()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}:${sec}`;
      };
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: formatDate(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingDispenseReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_dispense_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Dispense PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Dispense PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Refill Report (รายการเติมตู้ Weighing) - Excel
   */
  async generateWeighingRefillExcel(params: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('+', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const formatDate = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        const sec = String(date.getUTCSeconds()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}:${sec}`;
      };
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: formatDate(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingRefillReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_refill_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Refill Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Refill Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Refill Report (รายการเติมตู้ Weighing) - PDF
   */
  async generateWeighingRefillPdf(params: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('+', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const formatDate = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        const sec = String(date.getUTCSeconds()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}:${sec}`;
      };
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: formatDate(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingRefillReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_refill_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Refill PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Refill PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Stock Report (รายการสต๊อกในตู้ Weighing) - Excel
   */
  async generateWeighingStockExcel(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findAll({
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const cabinetName = (r: any) =>
        r?.cabinet ? r.cabinet.cabinet_name || r.cabinet.cabinet_code || '-' : '-';
      const slotDisplay = (v: any) => (v === 1 ? 'ใน' : v === 2 ? 'นอก' : v != null ? String(v) : '-');
      const reportData: WeighingStockReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          cabinet_name: cabinetName(r),
          slot_no: Number(r?.SlotNo) ?? 0,
          sensor: Number(r?.Sensor) ?? 0,
          channel_display: r?.SlotNo != null ? String(r.SlotNo) : '-',
          slot_display: slotDisplay(r?.Sensor),
          qty: Number(r?.Qty) || 0,
        })),
      };
      const buffer = await this.weighingStockReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_stock_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Stock Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Stock Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Stock Report (รายการสต๊อกในตู้ Weighing) - PDF
   */
  async generateWeighingStockPdf(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findAll({
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const cabinetName = (r: any) =>
        r?.cabinet ? r.cabinet.cabinet_name || r.cabinet.cabinet_code || '-' : '-';
      const slotDisplay = (v: any) => (v === 1 ? 'ใน' : v === 2 ? 'นอก' : v != null ? String(v) : '-');
      const reportData: WeighingStockReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.itemcode || '-',
          cabinet_name: cabinetName(r),
          slot_no: Number(r?.SlotNo) ?? 0,
          sensor: Number(r?.Sensor) ?? 0,
          channel_display: r?.SlotNo != null ? String(r.SlotNo) : '-',
          slot_display: slotDisplay(r?.Sensor),
          qty: Number(r?.Qty) || 0,
        })),
      };
      const buffer = await this.weighingStockReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_stock_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Stock PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Stock PDF report: ${errorMessage}`);
    }
  }

  /**
   * Get Dispensed Items for Patients Report Data
   * ดึงข้อมูลจาก medical supply usage ที่มี supply_items และเชื่อมโยงกับ dispensed items
   */
  async getDispensedItemsForPatientsData(params: {
    keyword?: string;
    item_keyword?: string;
    patient_keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    EN?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<DispensedItemsForPatientsReportData> {
    try {
      const query: GetMedicalSupplyUsagesQueryDto = {
        startDate: params.startDate,
        endDate: params.endDate,
        patient_hn: params.patientHn,
        HN: params.patientHn,
        EN: params.EN,
        department_code: params.departmentCode,
        usage_type: params.usageType,
        item_keyword: (params.item_keyword ?? params.keyword)?.trim() || undefined,
        patient_keyword: params.patient_keyword?.trim() || undefined,
        page: 1,
        limit: 5000,
      };

      const result = await this.medicalSuppliesService.findAll(query);
      const usages = result.data ?? [];

      const filterDeptId = params.departmentCode ? parseInt(params.departmentCode, 10) : NaN;
      let filterDeptName: string | undefined = params.departmentCode;
      if (!Number.isNaN(filterDeptId)) {
        const dept = await this.prisma.department.findUnique({
          where: { ID: filterDeptId },
          select: { DepName: true, DepName2: true },
        });
        filterDeptName = dept?.DepName ?? dept?.DepName2 ?? params.departmentCode;
      }

      const usage_groups: DispensedItemsForPatientsReportData['usage_groups'] = [];
      let total_detail_lines = 0;

      usages.forEach((usage, index) => {
        const supplyItems = (usage.supply_items ?? []) as SupplyUsageItemRow[];
        const seq = index + 1;

        const grouped = groupSupplyItemsLatest(supplyItems, {
          startDate: params.startDate,
          endDate: params.endDate,
        });

        const items: DispensedItemsForPatientsReportData['usage_groups'][0]['items'] = grouped.map(
          (item, itemIdx) => ({
            seq: itemIdx + 1,
            itemcode: String(item.order_item_code ?? item.supply_code ?? '-'),
            itemname: String(item.order_item_description ?? item.supply_name ?? '-'),
            qty: Number(item.qty ?? item.quantity ?? 0),
            uom: String(item.uom ?? item.unit ?? '-'),
            assession_no: String(item.assession_no ?? '-'),
            created_at: item.created_at ? formatReportDateTime(item.created_at) : '-',
            updated_at: item.updated_at ? formatReportDateTime(item.updated_at) : '-',
            order_item_status_label: getOrderItemStatusLabel(item.order_item_status),
          }),
        );

        total_detail_lines += items.length;

        usage_groups.push({
          usage_seq: seq,
          patient_hn: usage.patient_hn ?? '-',
          en: usage.en ?? '-',
          items,
          empty_message:
            items.length === 0
              ? supplyItems.length === 0
                ? 'ไม่มีรายการอุปกรณ์'
                : 'ไม่มีรายการอุปกรณ์ที่สร้างหรือแก้ไขในช่วงวันที่ที่กรอง'
              : undefined,
        });
      });

      return {
        filters: {
          keyword: params.keyword,
          item_keyword: params.item_keyword ?? params.keyword,
          patient_keyword: params.patient_keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          patientHn: params.patientHn,
          departmentCode: params.departmentCode,
          departmentName: filterDeptName,
          usageType: params.usageType,
        },
        summary: {
          total_usages: result.total,
          total_detail_lines,
        },
        usage_groups,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Dispensed Items for Patients data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Dispensed Items for Patients report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items for Patients Report (บันทึกใช้อุปกรณ์กับคนไข้) - Excel
   */
  async generateDispensedItemsForPatientsExcel(params: {
    keyword?: string;
    item_keyword?: string;
    patient_keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    EN?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getDispensedItemsForPatientsData(params);
      const buffer = await this.dispensedItemsForPatientsExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_for_patients_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items for Patients Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items for Patients Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items for Patients Report (บันทึกใช้อุปกรณ์กับคนไข้) - PDF
   */
  async generateDispensedItemsForPatientsPdf(params: {
    keyword?: string;
    item_keyword?: string;
    patient_keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    EN?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getDispensedItemsForPatientsData(params);
      const buffer = await this.dispensedItemsForPatientsPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_for_patients_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items for Patients PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items for Patients PDF report: ${errorMessage}`);
    }
  }

  private formatBorrowDepartmentLabel(
    bd: { DepName?: string | null; DepName2?: string | null; RefDepID?: string | null; ID?: number } | null,
    depId: number | null,
  ): string {
    if (!bd) return depId != null ? String(depId) : '-';
    const name = (bd.DepName ?? bd.DepName2 ?? '').trim();
    if (!name) return bd.ID != null ? String(bd.ID) : '-';
    const ref = bd.RefDepID?.trim();
    return ref ? `${name} (${ref})` : name;
  }

  private mapItemBorrowReportRows(rawRows: any[]): ItemBorrowReportRow[] {
    return rawRows.map((row) => ({
      rowId: row.rowId,
      itemCode: row.itemCode ?? null,
      itemName: row.itemName ?? null,
      qty: row.qty ?? null,
      borrowDepartmentLabel: this.formatBorrowDepartmentLabel(row.borrowDepartment ?? null, row.depId ?? null),
      cabinetName:
        row.cabinet?.cabinet_name?.trim() ||
        row.cabinet?.cabinet_code?.trim() ||
        '-',
      modifyDate: row.modifyDate ?? null,
    }));
  }

  private async getDepartmentNameById(id?: string): Promise<string | undefined> {
    if (id == null || String(id).trim() === '') return undefined;
    const deptId = parseInt(String(id).trim(), 10);
    if (Number.isNaN(deptId)) return undefined;
    const dept = await this.prisma.department.findUnique({
      where: { ID: deptId },
      select: { DepName: true, DepName2: true },
    });
    return dept?.DepName ?? dept?.DepName2 ?? undefined;
  }

  async getItemBorrowReportData(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    borrowDepartmentId?: string;
  }): Promise<{ data: ItemBorrowReportRow[]; total: number }> {
    try {
      const batchLimit = 100;
      const aggregated: any[] = [];
      let reportedTotal = 0;
      let page = 1;

      while (true) {
        const result = await this.itemService.findBorrowItemStocks({
          page,
          limit: batchLimit,
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId:
            params.departmentId != null && params.departmentId !== ''
              ? parseInt(params.departmentId, 10)
              : undefined,
          cabinetId:
            params.cabinetId != null && params.cabinetId !== ''
              ? parseInt(params.cabinetId, 10)
              : undefined,
          borrowDepartmentId:
            params.borrowDepartmentId != null && params.borrowDepartmentId !== ''
              ? parseInt(params.borrowDepartmentId, 10)
              : undefined,
        });

        if (!result?.success) {
          throw new Error(result?.message || 'Failed to fetch item borrow data');
        }

        const batch = Array.isArray(result.data) ? result.data : [];
        reportedTotal = result.total != null ? Number(result.total) : aggregated.length + batch.length;
        aggregated.push(...batch);

        if (batch.length < batchLimit || aggregated.length >= reportedTotal) {
          break;
        }
        page += 1;
        if (page > 500) {
          console.warn('[Report Service] item-borrow: stopped batch fetch after 500 pages');
          break;
        }
      }

      return {
        data: this.mapItemBorrowReportRows(aggregated),
        total: reportedTotal,
      };
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Item Borrow Report data: ${errorMessage}`);
    }
  }

  private async buildItemBorrowReportData(
    borrowData: { data: ItemBorrowReportRow[]; total: number },
    params: {
      keyword?: string;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      cabinetId?: string;
      borrowDepartmentId?: string;
    },
  ): Promise<ItemBorrowReportData> {
    const [cabinetLabels, departmentName, borrowDepartmentName] = await Promise.all([
      this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId),
      this.getDepartmentNameById(params.departmentId),
      this.getDepartmentNameById(params.borrowDepartmentId),
    ]);

    const rows = borrowData.data ?? [];
    return {
      filters: {
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
        borrowDepartmentId: params.borrowDepartmentId,
        departmentName: cabinetLabels.departmentName ?? departmentName,
        cabinetName: cabinetLabels.cabinetName,
        borrowDepartmentName,
      },
      summary: {
        total_records: borrowData.total || rows.length,
        total_qty: rows.reduce((sum, row) => sum + (row.qty ?? 0), 0),
      },
      data: rows,
    };
  }

  async generateItemBorrowReportExcel(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    borrowDepartmentId?: string;
  }): Promise<Buffer> {
    try {
      const borrowData = await this.getItemBorrowReportData(params);
      const reportData = await this.buildItemBorrowReportData(borrowData, params);
      return await this.itemBorrowReportExcelService.generateReport(reportData);
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Borrow Report Excel: ${errorMessage}`);
    }
  }

  async generateItemBorrowReportPdf(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    borrowDepartmentId?: string;
  }): Promise<Buffer> {
    try {
      const borrowData = await this.getItemBorrowReportData(params);
      const reportData = await this.buildItemBorrowReportData(borrowData, params);
      return await this.itemBorrowReportPdfService.generateReport(reportData);
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Borrow Report PDF: ${errorMessage}`);
    }
  }

  private buildCabinetTempHumReportData(params: {
    year?: number;
    month?: number;
  }): Promise<CabinetTempHumReportData> {
    return this.getCabinetTempHumReportData(params);
  }

  private async getCabinetTempHumReportData(params: {
    year?: number;
    month?: number;
  }): Promise<CabinetTempHumReportData> {
    const now = new Date();
    const year = params.year ?? now.getFullYear();
    const month = params.month ?? now.getMonth() + 1;
    const overview = await this.cabinetTempHumService.getOverview({ year, month });
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      timeZone: 'Asia/Bangkok',
    });
    const toUtcDate = (at: Date | string | null | undefined) => {
      if (at == null) return null;
      const d = new Date(at);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const formatLogTime = (at: Date | string | null | undefined) => {
      const d = toUtcDate(at);
      if (!d) return '-';
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    };
    const utcDay = (at: Date | string | null | undefined) => toUtcDate(at)?.getUTCDate();
    const totalLogs = overview.cabinets.reduce((sum, c) => sum + (c.log_count ?? c.logs?.length ?? 0), 0);
    return {
      filters: { year, month, month_label: monthLabel },
      summary: { total_rows: overview.cabinets.length, total_logs: totalLogs },
      data: overview.cabinets.map((c, i) => {
        const name = c.cabinet_name?.trim() || c.cabinet_code?.trim() || `ตู้ #${c.log_cabinet_id}`;
        const at = c.last_log_at;
        const full = at ? formatReportDateTimeUtc(at) : '-';
        const datePart = at ? formatReportDateOnlyUtc(at) : '-';
        const timePart = formatLogTime(at);
        return {
          seq: i + 1,
          cabinet_name: name,
          log_date: datePart || full,
          log_time: timePart,
          temp: c.latest_temp != null ? c.latest_temp.toFixed(1) : '-',
          hum: c.latest_hum != null ? c.latest_hum.toFixed(1) : '-',
          subRows: (c.logs ?? []).map((log, logIndex) => ({
            seq: logIndex + 1,
            day: utcDay(log.create_date),
            log_date: formatReportDateOnlyUtc(log.create_date),
            log_time: formatLogTime(log.create_date),
            temp: log.temp_log != null ? Number(log.temp_log).toFixed(1) : '-',
            hum: log.hum_log != null ? Number(log.hum_log).toFixed(1) : '-',
          })),
        };
      }),
    };
  }

  async generateCabinetTempHumExcel(params: {
    year?: number;
    month?: number;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.buildCabinetTempHumReportData(params);
      const buffer = await this.cabinetTempHumReportExcelService.generateReport(reportData);
      const ym = `${reportData.filters?.year ?? ''}${String(reportData.filters?.month ?? '').padStart(2, '0')}`;
      return { buffer, filename: `cabinet_temp_hum_report_${ym}.xlsx` };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Temp Hum Excel report: ${errorMessage}`);
    }
  }

  async generateCabinetTempHumChartPdf(params: {
    year?: number;
    month?: number;
    cabinet_id?: number;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      if (params.cabinet_id == null) {
        throw new Error('กรุณาเลือกตู้ก่อนดาวน์โหลดกราฟ');
      }
      const now = new Date();
      const year = params.year ?? now.getFullYear();
      const month = params.month ?? now.getMonth() + 1;
      const chart = await this.cabinetTempHumService.getChart({
        cabinet_id: params.cabinet_id,
        year,
        month,
        limit: 2000,
      });
      const cabinetName =
        chart.selected?.cabinet_name?.trim() ||
        chart.selected?.cabinet_code?.trim() ||
        `ตู้ #${chart.selected?.log_cabinet_id ?? params.cabinet_id}`;
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        timeZone: 'Asia/Bangkok',
      });
      const buffer = await this.cabinetTempHumChartPdfService.generateReport({
        cabinet_name: cabinetName,
        year,
        month,
        month_label: monthLabel,
        points: chart.points ?? [],
      });
      const ym = `${year}${String(month).padStart(2, '0')}`;
      return { buffer, filename: `cabinet_temp_hum_chart_${params.cabinet_id}_${ym}.pdf` };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Temp Hum Chart PDF: ${errorMessage}`);
    }
  }

  async generateCabinetTempHumPdf(params: {
    year?: number;
    month?: number;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.buildCabinetTempHumReportData(params);
      const buffer = await this.cabinetTempHumReportPdfService.generateReport(reportData);
      const ym = `${reportData.filters?.year ?? ''}${String(reportData.filters?.month ?? '').padStart(2, '0')}`;
      return { buffer, filename: `cabinet_temp_hum_report_${ym}.pdf` };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Temp Hum PDF report: ${errorMessage}`);
    }
  }
}
