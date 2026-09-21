import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ReturnReportData, getReturnReasonLabel } from './return-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';

export type { ReturnReportData };

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

function formatReturnByUserName(name?: string | null): string {
  const n = name?.trim();
  return n && n !== 'ไม่ระบุ' ? n : '-';
}

function formatReturnDateTime(value?: Date | string | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    return formatReportDateTimeUtc(value.toISOString());
  }
  return formatReportDateTimeUtc(value);
}

function formatCabinetDisplay(record: {
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
}): string {
  return [record.cabinet_name || record.cabinet_code, record.department_name].filter(Boolean).join(' / ') || '-';
}

@Injectable()
export class ReturnReportPdfService {
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

  async generateReport(data: ReturnReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

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
        doc.font(finalFontBoldName).fontSize(13);
        doc.font(finalFontName).fontSize(13);
      }
    } catch {
      // keep default
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = formatReportDateOnly(new Date());

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;

        const headerTop = 35;
        const headerHeight = 48;
        doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

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
        doc.text('รายงานอุปกรณ์ที่ไม่ถูกใช้งาน', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Return Report', margin, headerTop + 22, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 14;

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
          width: contentWidth,
          align: 'right',
        });
        doc.fillColor('#000000');
        doc.y += 6;

        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'วันที่เริ่ม', value: formatFilterDateSlashBE(filters.date_from) },
          { label: 'วันที่สิ้นสุด', value: formatFilterDateSlashBE(filters.date_to) },
          {
            label: 'สาเหตุ',
            value: filters.return_reason ? getReturnReasonLabel(filters.return_reason) : 'ทั้งหมด',
          },
        ];
        const filterColWidth = Math.floor(contentWidth / filterCells.length);
        let fx = margin;
        filterCells.forEach((fc, i) => {
          const cw =
            i === filterCells.length - 1
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
        const colPct = [0.05, 0.10, 0.18, 0.14, 0.12, 0.06, 0.15, 0.12, 0.08];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[2] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ',
          'รหัสอุปกรณ์',
          'ชื่ออุปกรณ์',
          'ตู้',
          'ชื่อผู้เติม',
          'จำนวน',
          'สาเหตุ',
          'วันที่',
          'หมายเหตุ',
        ];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(13).font(finalFontBoldName);
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: 'center',
            });
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
        if (data.data.length === 0) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          for (let idx = 0; idx < data.data.length; idx++) {
            const record = data.data[idx];
            const itemCode = record.supply_item?.order_item_code || record.supply_item?.supply_code || '-';
            const itemName = record.supply_item?.order_item_description || record.supply_item?.supply_name || '-';

            const cellTexts = [
              String(idx + 1),
              String(itemCode),
              String(itemName),
              formatCabinetDisplay(record),
              formatReturnByUserName(record.return_by_user_name),
              String(record.qty_returned),
              getReturnReasonLabel(record.return_reason),
              formatReturnDateTime(record.return_datetime),
              record.return_note || '-',
            ];

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
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            let xPos = margin;
            for (let i = 0; i < headers.length; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 2 || i === 3 || i === 4 || i === 6 || i === 8 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(
          `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ | จำนวนชิ้น: ${data.summary?.total_qty_returned ?? 0} ชิ้น`,
          margin,
          doc.y + 6,
          { width: contentWidth, align: 'center' },
        );
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
