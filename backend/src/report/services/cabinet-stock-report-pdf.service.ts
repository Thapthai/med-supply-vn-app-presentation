import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { CabinetStockReportData, CabinetStockRow } from './cabinet-stock-report-excel.service';
import { resolveCabinetStockShowRowHighlight, CABINET_STOCK_NEUTRAL_ROW_BG } from '../utils/cabinet-stock-row-highlight.util';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly } from '../utils/date-timeformat';
import {
  formatQtyWithMainUnitForReport,
  formatQtyPlainForReport,
  formatCabinetStockMinMaxForReport,
  formatCabinetStockRemark,
  type ReportItemUnitFields,
} from '../utils/format-item-qty';

@Injectable()
export class CabinetStockReportPdfService {
  private async registerThaiFont(doc: PDFKit.PDFDocument): Promise<boolean> {
    try {
      const fonts = getReportThaiFontPaths();
      if (!fonts || !fs.existsSync(fonts.regular)) return false;
      doc.registerFont('ThaiFont', fonts.regular);
      doc.registerFont('ThaiFontBold', fonts.bold);
      return true;
    } catch {
      return false;
    }
  }

  private getLogoBuffer(): Buffer | null {
    const logoPath = resolveReportLogoPath();
    if (!logoPath || !fs.existsSync(logoPath)) return null;
    try {
      return fs.readFileSync(logoPath);
    } catch {
      return null;
    }
  }

  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 10,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let finalFontName = 'Helvetica';
    let finalFontBoldName = 'Helvetica-Bold';
    try {
      const hasThai = await this.registerThaiFont(doc);
      if (hasThai) {
        finalFontName = 'ThaiFont';
        finalFontBoldName = 'ThaiFontBold';
        // prime ฟอนต์บน page แรก เพื่อให้ PDFKit embed font ใน resource ของ page 1
        doc.font(finalFontBoldName).fontSize(13);
        doc.font(finalFontName).fontSize(13);
      }
    } catch {
      // keep default
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate =
      data.reportDateDisplay ??
      formatReportDateOnly(new Date());

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const summary = data?.summary ?? { total_rows: 0, total_qty: 0, total_refill_qty: 0 };
        const rows = data?.data && Array.isArray(data.data) ? data.data : [];
        const showRowHighlight = resolveCabinetStockShowRowHighlight(data);

        // ---- Header block with logo ----
        const headerTop = 35;
        const headerHeight = 48;
        doc.rect(margin, headerTop, contentWidth, headerHeight)
          .fillAndStroke('#F8F9FA', '#DEE2E6');

        if (logoBuffer && logoBuffer.length > 0) {
          try {
            doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
          } catch {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { width: 70 });
            } catch {
              // skip logo
            }
          }
        }

        doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
        doc.text('รายงานสต็อกอุปกรณ์ในตู้', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Cabinet Stock Report', margin, headerTop + 22, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 14;

        // วันที่รายงาน
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
          width: contentWidth,
          align: 'right',
        });
        doc.fillColor('#000000');
        doc.y += 6;

        // ---- ตาราง Filter Summary (1 แถว) ----
        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'ตู้ Cabinet', value: filters.cabinetName ?? filters.cabinetCode ?? 'ทั้งหมด' },
          { label: 'แผนก', value: filters.departmentName ?? (filters.departmentId != null ? `แผนก ${filters.departmentId}` : 'ทั้งหมด') },
          { label: 'จำนวนรายการ', value: `${data.summary?.total_rows ?? 0} รายการ` },
        ];
        const filterColWidth = Math.floor(contentWidth / filterCells.length);
        let fx = margin;
        filterCells.forEach((fc, i) => {
          const cw = i === filterCells.length - 1
            ? contentWidth - filterColWidth * (filterCells.length - 1)
            : filterColWidth;
          doc.rect(fx, filterY, cw, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
          doc.fontSize(11).font(finalFontBoldName).fillColor('#444444');
          doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
          doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
          doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
          fx += cw;
        });
        doc.fillColor('#000000');
        doc.y = filterY + filterRowHeight + 8;

        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        // 5 คอลัมน์ตัวเลข (index 4-8) กว้างเท่ากัน, รหัส+อุปกรณ์กว้างขึ้น
        // ลำดับ:0.04 แผนก:0.09 รหัส:0.11 อุปกรณ์:0.21 | 5x0.11
        // ลำดับ, แผนก, รหัสอุปกรณ์(เหลือ), อุปกรณ์, จำนวนในตู้, ถูกใช้งาน, ไม่ถูกใช้งาน, Min/Max, จำนวนที่ต้องเติม
 
        const colPct = [0.05, 0.13, 0.13, 0.14, 0.09, 0.08, 0.08, 0.08, 0.10, 0.08];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[colWidths.length - 1] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ',
          'แผนก',
          'รหัสอุปกรณ์',
          'อุปกรณ์',
          'จำนวนในตู้',
          'ถูกใช้งาน',
          'ไม่ถูกใช้งาน',
          'Min/Max',
          'จำนวนที่ต้องเติม',
          'หมายเหตุ',
        ];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(13).font(finalFontBoldName);
          // พื้นหลังทั้งแถว
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: 'center',
            });
            // เส้นกั้นแนวตั้งระหว่างคอลัมน์ (ยกเว้นคอลัมน์สุดท้าย)
            if (i < headers.length - 1) {
              doc.save();
              doc.strokeColor('#4A6FA0').lineWidth(0.5);
              doc.moveTo(x + colWidths[i], y + 4).lineTo(x + colWidths[i], y + itemHeight - 4).stroke();
              doc.restore();
            }
            x += colWidths[i];
          });
          doc.fillColor('#000000');
        };

        const tableHeaderY = doc.y;
        drawTableHeader(tableHeaderY);
        doc.y = tableHeaderY + itemHeight;

        doc.fontSize(13).font(finalFontName).fillColor('#000000');
        if (rows.length === 0) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx] as CabinetStockRow;
            const seq = row.seq ?? idx + 1;
            const dept = row.department_name ?? '-';
            const code = row.item_code ?? '-';
            const name = row.item_name ?? '-';
            const bal = row.balance_qty ?? 0;
            const qtyInUse = row.qty_in_use ?? 0;
            const damagedQty = row.damaged_qty ?? 0;
            const smax = row.stock_max;
            const smin = row.stock_min;
            const refill = row.refill_qty ?? 0;
            const u: ReportItemUnitFields = {
              unit: row.unit,
              subUnit: row.subUnit,
              SubUnitQty: row.SubUnitQty,
            };
            const minMaxStr = formatCabinetStockMinMaxForReport(smin, smax, showRowHighlight);
            const cellTexts = [
              String(seq),
              String(dept),
              String(code),
              String(name),
              formatQtyWithMainUnitForReport(bal, u),
              formatQtyPlainForReport(qtyInUse),
              formatQtyPlainForReport(damagedQty),
              minMaxStr,
              formatQtyPlainForReport(refill),
              formatCabinetStockRemark(row, { showRowHighlight }),
            ];

            // คำนวณความสูงแถวตามข้อความที่อาจขึ้นบรรทัดใหม่
            doc.fontSize(13).font(finalFontName);
            const cellHeights = cellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
            });
            const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

            if (doc.y + rowHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
              doc.y = margin;
              const newHeaderY = doc.y;
              drawTableHeader(newHeaderY);
              doc.y = newHeaderY + itemHeight;
              // reset font กลับเป็น regular หลัง drawTableHeader
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            const stockMin = smin ?? 0;
            const isLowStock = stockMin > 0 && bal < stockMin;
            const bg = !showRowHighlight
              ? CABINET_STOCK_NEUTRAL_ROW_BG.hex
              : row.has_expired
                ? '#FFEDD5'
                : row.has_near_expiry
                  ? '#FEF3C7'
                  : isLowStock
                    ? '#FEE2E2'
                    : idx % 2 === 0
                      ? '#FFFFFF'
                      : '#F8F9FA';
            let xPos = margin;
            for (let i = 0; i < headers.length; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 || i === 2 || i === 3 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(
          showRowHighlight
            ? 'หมายเหตุ: จำนวนในตู้ = ชิ้นในตู้ (IsStock=1) | ถูกใช้งาน = supply_usage_items ตามวันที่รายงาน | จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้ | สีแดง = ต่ำกว่า Min | สีเหลือง = ใกล้หมดอายุ | สีส้ม = หมดอายุ'
            : 'หมายเหตุ: จำนวนในตู้ = ชิ้นในตู้ (IsStock=1) | ถูกใช้งาน = supply_usage_items ตามวันที่รายงาน | จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้ | ไม่แสดงสี highlight เมื่อกรองตู้ = ทั้งหมด',
          margin,
          doc.y + 6,
          {
            width: contentWidth,
            align: 'center',
          },
        );
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
