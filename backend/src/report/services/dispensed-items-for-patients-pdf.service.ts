import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  DispensedItemsForPatientsReportData,
  DispensedUsageDetailGroup,
} from './dispensed-items-for-patients-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

const DETAIL_HEADERS = [
  'ลำดับ',
  'รหัสอุปกรณ์',
  'ชื่ออุปกรณ์',
  'จำนวน',
  'หน่วย',
  'Assession No',
  'วันที่สร้าง',
  'วันที่แก้ไข',
  'สถานะ',
];

function formatFilterDateOnly(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateOnly(v);
}

@Injectable()
export class DispensedItemsForPatientsPdfService {
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

  async generateReport(data: DispensedItemsForPatientsReportData): Promise<Buffer> {
    if (!data?.usage_groups || !Array.isArray(data.usage_groups)) {
      throw new Error('Invalid data structure: usage_groups must be an array');
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
        doc.font(finalFontBoldName).fontSize(15);
        doc.font(finalFontName).fontSize(15);
      }
    } catch {
      // keep default
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = formatReportDateTime(new Date());

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const groups = data.usage_groups ?? [];

        const headerTop = 35;
        const headerHeight = 56;
        doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

        if (logoBuffer && logoBuffer.length > 0) {
          try {
            doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
          } catch {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { width: 70 });
            } catch {
              // skip
            }
          }
        }

        doc.fontSize(18).font(finalFontBoldName).fillColor('#1A365D');
        doc.text('บันทึกใช้อุปกรณ์กับคนไข้ — รายการอุปกรณ์ที่เบิก', margin, headerTop + 8, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 12;

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
          width: contentWidth,
          align: 'right',
        });
        doc.fillColor('#000000');
        doc.y += 4;

        const filters = data.filters ?? {};
        const filterCells = [
          { label: 'วันที่เริ่ม', value: formatFilterDateOnly(filters.startDate) },
          { label: 'วันที่สิ้นสุด', value: formatFilterDateOnly(filters.endDate) },
          {
            label: 'แผนก',
            value: (filters as { departmentName?: string }).departmentName ?? filters.departmentCode ?? 'ทั้งหมด',
          },
          {
            label: 'แผนกย่อย',
            value: filters.usageType?.trim() ? filters.usageType.trim() : 'ทั้งหมด',
          },
        ];
        const filterRowHeight = 40;
        const filterY = doc.y;
        const filterColWidth = Math.floor(contentWidth / filterCells.length);
        let fx = margin;
        filterCells.forEach((fc, i) => {
          const cw =
            i === filterCells.length - 1
              ? contentWidth - filterColWidth * (filterCells.length - 1)
              : filterColWidth;
          doc.save();
          doc.fillColor('#E8EDF2').rect(fx, filterY, cw, filterRowHeight).fill();
          doc.strokeColor('#DEE2E6').lineWidth(0.5).rect(fx, filterY, cw, filterRowHeight).stroke();
          doc.restore();
          doc.fontSize(10).font(finalFontBoldName).fillColor('#444444');
          doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
          doc.fontSize(11).font(finalFontName).fillColor('#1A365D');
          doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
          fx += cw;
        });
        doc.fillColor('#000000');
        doc.y = filterY + filterRowHeight + 6;

        if (filters.startDate || filters.endDate) {
          doc.fontSize(10).font(finalFontName).fillColor('#444444');
          doc.text(
            `แสดงตามวันที่เลือก: ${filters.startDate || '–'} ถึง ${filters.endDate || '–'}`,
            margin,
            doc.y,
            { width: contentWidth },
          );
          doc.y += 14;
        }

        const itemHeight = 32;
        const cellPadding = 3;
        const colPct = [0.05, 0.1, 0.22, 0.06, 0.08, 0.1, 0.13, 0.13, 0.13];
        const colWidths = colPct.map((p) => Math.floor(contentWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < contentWidth) colWidths[2] += contentWidth - sumW;

        const drawDetailHeader = (y: number) => {
          let x = margin;
          doc.fontSize(10).font(finalFontBoldName);
          doc.rect(margin, y, contentWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          DETAIL_HEADERS.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: 'center',
              lineGap: 0,
            });
            if (i < DETAIL_HEADERS.length - 1) {
              doc.save();
              doc.strokeColor('#4A6FA0').lineWidth(0.5);
              doc
                .moveTo(x + colWidths[i], y + 4)
                .lineTo(x + colWidths[i], y + itemHeight - 4)
                .stroke();
              doc.restore();
              doc.fillColor('#FFFFFF');
            }
            x += colWidths[i];
          });
          doc.font(finalFontName).fillColor('#000000');
        };

        const drawDataRow = (cellTexts: string[], bg: string, statusLabel?: string) => {
          doc.fontSize(9).font(finalFontName);
          const cellHeights = cellTexts.map((text, i) => {
            const w = Math.max(4, colWidths[i] - cellPadding * 2);
            return doc.heightOfString(text ?? '-', { width: w, lineGap: 0 });
          });
          const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

          if (doc.y + rowHeight > pageHeight - 40) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
            doc.y = margin;
            drawDetailHeader(doc.y);
            doc.y += itemHeight;
            doc.fontSize(9).font(finalFontName);
          }

          const rowY = doc.y;
          let xPos = margin;
          for (let i = 0; i < DETAIL_HEADERS.length; i++) {
            const cw = colWidths[i];
            const w = Math.max(4, cw - cellPadding * 2);
            let cellBg = bg;
            let textColor = '#000000';
            if (i === 8 && statusLabel) {
              const sl = statusLabel.toLowerCase();
              if (sl === 'ยืนยันแล้ว') {
                cellBg = '#D4EDDA';
                textColor = '#155724';
              } else if (sl === 'ยกเลิก') {
                cellBg = '#F8D7DA';
                textColor = '#721C24';
              }
            }
            doc.save();
            doc.fillColor(cellBg).rect(xPos, rowY, cw, rowHeight).fill();
            doc.strokeColor('#DEE2E6').lineWidth(0.5).rect(xPos, rowY, cw, rowHeight).stroke();
            doc.restore();
            doc.fontSize(9).font(finalFontName).fillColor(textColor);
            doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
              width: w,
              align: i === 2 ? 'left' : 'center',
              lineGap: 0,
            });
            xPos += cw;
          }
          doc.fillColor('#000000');
          doc.y = rowY + rowHeight;
        };

        const renderGroup = (group: DispensedUsageDetailGroup) => {
          const groupLabel = `รายการเบิกที่ ${group.usage_seq}  |  HN ${group.patient_hn}  |  EN ${group.en}`;
          doc.fontSize(10).font(finalFontBoldName);
          const labelH = doc.heightOfString(groupLabel, { width: contentWidth - 12 }) + 8;
          if (doc.y + labelH + itemHeight > pageHeight - 40) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
            doc.y = margin;
          }
          const labelY = doc.y;
          doc.save();
          doc.fillColor('#E8EDF2').rect(margin, labelY, contentWidth, labelH).fill();
          doc.strokeColor('#DEE2E6').lineWidth(0.5).rect(margin, labelY, contentWidth, labelH).stroke();
          doc.restore();
          doc.font(finalFontBoldName).fillColor('#1A365D');
          doc.text(groupLabel, margin + 6, labelY + 4, { width: contentWidth - 12 });
          doc.font(finalFontName).fillColor('#000000');
          doc.y = labelY + labelH + 4;

          if (group.empty_message) {
            const msgY = doc.y;
            doc.fontSize(9).font(finalFontName);
            const msgH = doc.heightOfString(group.empty_message, { width: contentWidth - 12 }) + 12;
            doc.save();
            doc.fillColor('#F8F9FA').rect(margin, msgY, contentWidth, msgH).fill();
            doc.strokeColor('#DEE2E6').lineWidth(0.5).rect(margin, msgY, contentWidth, msgH).stroke();
            doc.restore();
            doc.fillColor('#6C757D');
            doc.text(group.empty_message, margin + 6, msgY + 6, {
              width: contentWidth - 12,
              align: 'center',
            });
            doc.fillColor('#000000');
            doc.y += msgH + 6;
            return;
          }

          group.items.forEach((item) => {
            drawDataRow(
              [
                String(item.seq),
                item.itemcode,
                item.itemname,
                String(item.qty),
                item.uom,
                item.assession_no,
                item.created_at,
                item.updated_at,
                item.order_item_status_label,
              ],
              '#FFFFFF',
              item.order_item_status_label,
            );
          });
          doc.y += 8;
        };

        if (groups.length === 0) {
          const emptyHeaderY = doc.y;
          drawDetailHeader(emptyHeaderY);
          doc.y = emptyHeaderY + itemHeight;
          drawDataRow(['ไม่มีข้อมูล', '', '', '', '', '', '', '', ''], '#F8F9FA');
        } else {
          const tableHeaderY = doc.y;
          drawDetailHeader(tableHeaderY);
          doc.y = tableHeaderY + itemHeight;
          groups.forEach((group) => renderGroup(group));
        }

        doc.fontSize(10).font(finalFontName).fillColor('#6C757D');
        doc.text(
          `จำนวนครั้งเบิก: ${data.summary?.total_usages ?? 0} รายการ | รายการอุปกรณ์รวม: ${data.summary?.total_detail_lines ?? 0} แถว`,
          margin,
          doc.y + 8,
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
