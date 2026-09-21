import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ItemBorrowReportData } from './item-borrow-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

@Injectable()
export class ItemBorrowReportPdfService {
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

  async generateReport(data: ItemBorrowReportData): Promise<Buffer> {
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

        const drawPageHeader = () => {
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
          doc.text('รายงานอุปกรณ์ยืม', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          doc.text('Item Borrow Report', margin, headerTop + 22, {
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
          const filterRows = [
            [
              { label: 'ค้นหา', value: filters.keyword?.trim() ? filters.keyword.trim() : 'ทั้งหมด' },
              {
                label: 'Division (ที่ตั้งตู้)',
                value:
                  filters.departmentName ??
                  (filters.departmentId ? filters.departmentId : 'ทั้งหมด'),
              },
              {
                label: 'ตู้ Cabinet',
                value: filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด'),
              },
            ],
            [
              {
                label: 'Division ที่ยืม',
                value:
                  filters.borrowDepartmentName ??
                  (filters.borrowDepartmentId ? filters.borrowDepartmentId : 'ทั้งหมด'),
              },
              { label: 'วันที่เริ่ม', value: formatFilterDateSlashBE(filters.startDate) },
              { label: 'วันที่สิ้นสุด', value: formatFilterDateSlashBE(filters.endDate) },
            ],
          ];

          filterRows.forEach((filterCells) => {
            const filterY = doc.y;
            const filterColWidth = Math.floor(contentWidth / filterCells.length);
            let fx = margin;
            filterCells.forEach((fc, i) => {
              const cw =
                i === filterCells.length - 1
                  ? contentWidth - filterColWidth * (filterCells.length - 1)
                  : filterColWidth;
              doc.rect(fx, filterY, cw, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
              doc.fontSize(10).font(finalFontBoldName).fillColor('#444444');
              doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
              doc.fontSize(11).font(finalFontName).fillColor('#1A365D');
              doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
              fx += cw;
            });
            doc.fillColor('#000000');
            doc.y = filterY + filterRowHeight + 6;
          });
        };

        drawPageHeader();

        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.06, 0.14, 0.28, 0.08, 0.20, 0.12, 0.12];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[2] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ',
          'รหัสอุปกรณ์',
          'ชื่ออุปกรณ์',
          'จำนวน',
          'Division ที่ยืม',
          'ตู้',
          'แก้ไขล่าสุด',
        ];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(11).font(finalFontBoldName);
          headers.forEach((h, i) => {
            const cw = colWidths[i];
            doc.rect(x, y, cw, itemHeight).fillAndStroke('#1A365D', '#4A6FA0');
            doc.fillColor('#FFFFFF');
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, cw - cellPadding * 2),
              align: 'center',
            });
            x += cw;
          });
          doc.fillColor('#000000');
        };

        const tableHeaderY = doc.y;
        drawTableHeader(tableHeaderY);
        doc.y = tableHeaderY + itemHeight;

        doc.fontSize(11).font(finalFontName).fillColor('#000000');
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
            const cellTexts = [
              String(idx + 1),
              record.itemCode ?? '-',
              record.itemName ?? '-',
              record.qty != null ? String(record.qty) : '-',
              record.borrowDepartmentLabel ?? '-',
              record.cabinetName ?? '-',
              record.modifyDate ? formatReportDateTimeUtc(record.modifyDate) : '-',
            ];

            doc.fontSize(11).font(finalFontName);
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
              doc.fontSize(11).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            let xPos = margin;
            for (let i = 0; i < headers.length; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(11).font(finalFontName).fillColor('#212529');
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 || i === 2 || i === 4 || i === 5 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        const footerY = Math.min(doc.y + 12, pageHeight - margin - 24);
        doc.fontSize(10).font(finalFontName).fillColor('#ADB5BD');
        doc.text('เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, footerY, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(10).fillColor('#6C757D');
        doc.text(
          `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ · รวมจำนวน ${data.summary?.total_qty ?? 0} ชิ้น`,
          margin,
          footerY + 14,
          { width: contentWidth, align: 'center' },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
