import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { DispensedItemsReportData, DispensedItemsReportGroup } from './dispensed-items-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateSlashBE, formatReportDateTimeUtc } from '../utils/date-timeformat';
import { formatQtyWithMainUnitForReport } from '../utils/format-item-qty';

function borrowRemarkCell(item: {
  isBorrow?: boolean;
  borrowRemark?: string | null;
}): string {
  if (item.isBorrow || (item.borrowRemark != null && String(item.borrowRemark).trim() !== '')) {
    const r = item.borrowRemark != null ? String(item.borrowRemark).trim() : '';
    return r || 'ยืม';
  }
  return '-';
}

/** filter วันที่เริ่ม/สิ้นสุด: ว่าง = ทั้งหมด, มีค่า = d/m/Y (พ.ศ.) */
function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

const COL_LEFT_PDF = new Set([1, 2, 5, 6, 8]);

@Injectable()
export class DispensedItemsPdfService {
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

  async generateReport(data: DispensedItemsReportData): Promise<Buffer> {
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
        // prime ฟอนต์บน page แรก เพื่อให้ PDFKit embed font ใน resource ของ page 1
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
        const rows = data.data ?? [];
        const useGroups = data.groups && data.groups.length > 0;

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
        doc.text('รายงานการเบิกอุปกรณ์', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Dispensed Items Report', margin, headerTop + 22, {
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

        // ---- ตาราง Filter Summary (1 แถว 4 ช่อง) ----
        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'แผนก', value: filters.departmentName ?? (filters.departmentId ? filters.departmentId : 'ทั้งหมด') },
          { label: 'ตู้ Cabinet', value: filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด') },
          { label: 'วันที่เริ่ม', value: formatFilterDateSlashBE(filters.startDate) },
          { label: 'วันที่สิ้นสุด', value: formatFilterDateSlashBE(filters.endDate) },
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

        // ---- ตารางข้อมูล (เพิ่ม จำนวนชิ้น) ----
        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.06, 0.09, 0.19, 0.08, 0.13, 0.12, 0.12, 0.07, 0.14];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[2] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ',
          'รหัสอุปกรณ์',
          'ชื่ออุปกรณ์',
          'จำนวน (หน่วยการเบิก)',
          'วันที่เบิก',
          'Division ที่ตั้งตู้',
          'Division ที่ยืม',
          'หมายเหตุ',
          'ชื่อผู้เบิก',
        ];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(13).font(finalFontBoldName);
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 6, {
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
        if (rows.length === 0 && !useGroups) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else if (useGroups && data.groups) {
          const groups = data.groups as DispensedItemsReportGroup[];
          let rowNum = 1;
          for (const group of groups) {
            const qtyDisplay = formatQtyWithMainUnitForReport(group.totalQty, group.items[0] ?? {});
            const g0 = group.items[0];
            const groupCellTexts = [
              String(rowNum),
              group.itemcode ?? '-',
              group.itemname ?? '-',
              qtyDisplay,
              formatReportDateTimeUtc(group.dispenseTime),
              g0?.departmentName ?? '-',
              g0?.borrowDepartmentName?.trim() ? g0.borrowDepartmentName : '-',
              borrowRemarkCell(g0 ?? {}),
              (() => {
                const n = g0?.cabinetUserName?.trim();
                return n && n !== 'ไม่ระบุ' ? n : '-';
              })(),
            ];
            doc.fontSize(12).font(finalFontBoldName);
            const groupCellHeights = groupCellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
            });
            const groupRowHeight = Math.max(itemHeight, Math.max(...groupCellHeights) + cellPadding * 2);
            if (doc.y + groupRowHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
              doc.y = margin;
              const newHeaderY = doc.y;
              drawTableHeader(newHeaderY);
              doc.y = newHeaderY + itemHeight;
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }
            const groupRowY = doc.y;
            let xPos = margin;
            for (let i = 0; i < 9; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, groupRowY, cw, groupRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
              doc.fontSize(12).font(finalFontBoldName).fillColor('#1A365D');
              doc.text(groupCellTexts[i] ?? '-', xPos + cellPadding, groupRowY + cellPadding, {
                width: w,
                align: COL_LEFT_PDF.has(i) ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = groupRowY + groupRowHeight;
            doc.fontSize(13).font(finalFontName).fillColor('#000000');

            group.items.forEach((item, subIdx) => {
              const cellTexts = [
                '',
                item?.itemcode ?? '-',
                item?.itemname ?? '-',
                formatQtyWithMainUnitForReport(item?.qty ?? 1, item ?? {}),
                formatReportDateTimeUtc(item?.modifyDate as string),
                item?.departmentName ?? '-',
                item?.borrowDepartmentName?.trim() ? item.borrowDepartmentName : '-',
                borrowRemarkCell(item ?? {}),
                item?.cabinetUserName && item.cabinetUserName !== 'ไม่ระบุ' ? item.cabinetUserName : '-',
              ];
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
              let x = margin;
              for (let i = 0; i < 9; i++) {
                const cw = colWidths[i];
                const w = Math.max(4, cw - cellPadding * 2);
                doc.rect(x, rowY, cw, rowHeight).fillAndStroke('#FFFFFF', '#DEE2E6');
                doc.fontSize(12).font(finalFontName).fillColor('#000000');
                doc.text(cellTexts[i] ?? '-', x + cellPadding, rowY + cellPadding, {
                  width: w,
                  align: COL_LEFT_PDF.has(i) ? 'left' : 'center',
                });
                x += cw;
              }
              doc.y = rowY + rowHeight;
            });
            rowNum++;
          }
        } else {
          for (let idx = 0; idx < rows.length; idx++) {
            const item = rows[idx];
            const cellTexts = [
              String(idx + 1),
              item?.itemcode ?? '-',
              item?.itemname ?? '-',
              formatQtyWithMainUnitForReport(item?.qty ?? 1, item ?? {}),
              formatReportDateTimeUtc(item?.modifyDate as string),
              item?.departmentName ?? '-',
              item?.borrowDepartmentName?.trim() ? item.borrowDepartmentName : '-',
              borrowRemarkCell(item ?? {}),
              item?.cabinetUserName ?? 'ไม่ระบุ',
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
            for (let i = 0; i < 9; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: COL_LEFT_PDF.has(i) ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        // หมายเหตุ (รูปแบบเดียวกับ cabinet-stock-report)
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`, margin, doc.y + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
