import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  CabinetDepartmentsReportData,
  CabinetDepartmentsReportRow,
} from './cabinet-departments-report-excel.service';

/** รายงานรวมทุกตู้ → แต่ละตู้เริ่มหน้าใหม่ */
function shouldSplitPagesByCabinet(data: CabinetDepartmentsReportData): boolean {
  const n = data.filters?.cabinetName;
  return n == null || String(n).trim() === '';
}

function groupRowsByCabinetInOrder(rows: CabinetDepartmentsReportRow[]): CabinetDepartmentsReportRow[][] {
  const groups: CabinetDepartmentsReportRow[][] = [];
  const keyToIndex = new Map<string, number>();
  for (const row of rows) {
    const key = row.cabinet_name ?? '-';
    if (!keyToIndex.has(key)) {
      keyToIndex.set(key, groups.length);
      groups.push([]);
    }
    groups[keyToIndex.get(key)!].push(row);
  }
  return groups;
}
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly } from '../utils/date-timeformat';

@Injectable()
export class CabinetDepartmentsReportPdfService {
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

  async generateReport(data: CabinetDepartmentsReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
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
        const shouldSplit = shouldSplitPagesByCabinet(data) && rows.length > 0;
        const groups = shouldSplit ? groupRowsByCabinetInOrder(rows) : [rows];

        const headerTop = 35;
        const headerHeight = 48;
        /** หัวรายงานเต็ม (โลโก้ + ชื่อ + วันที่) — ใช้เมื่อเริ่มตู้ใหม่ (รายงานรวมทุกตู้) */
        const drawFullReportHeader = () => {
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
          doc.text('รายงานจัดการตู้ Cabinet - แผนก', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          doc.text('Cabinet Departments Report', margin, headerTop + 22, {
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
        };

        // ---- ตารางข้อมูลหลัก + รายการอุปกรณ์ในตู้ ----
        const itemHeight = 28;
        const subRowHeight = 22;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.08, 0.22, 0.22, 0.22, 0.12, 0.14];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[5] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ',
          'ชื่อตู้',
          'แผนก',
          'จำนวนอุปกรณ์ (ถูกเบิก/ในตู้)',
          'สถานะ',
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
              align: i === 1 || i === 2 || i === 5 ? 'left' : 'center',
            });
            x += colWidths[i];
          });
          doc.fillColor('#000000');
        };

        const subHeaders = ['ลำดับ', 'รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'อยู่ในตู้', 'ถูกเบิก', 'จำนวนรวม'];
        const drawSubTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(11).font(finalFontBoldName);
          for (let i = 0; i < 6; i++) {
            doc.rect(x, y, colWidths[i], subRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
            doc.fillColor('#000000');
            doc.text(subHeaders[i], x + cellPadding, y + 5, {
              width: Math.max(4, colWidths[i] - cellPadding * 2),
              align: i === 1 || i === 2 ? 'left' : 'center',
            });
            x += colWidths[i];
          }
          doc.fillColor('#000000');
        };

        for (let g = 0; g < groups.length; g++) {
          const group = groups[g];
          if (g > 0 && shouldSplit) {
            doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
            doc.y = margin;
          }

          drawFullReportHeader();
          const tableHeaderY = doc.y;
          drawTableHeader(tableHeaderY);
          doc.y = tableHeaderY + itemHeight;

          doc.fontSize(13).font(finalFontName).fillColor('#000000');
          if (group.length === 0) {
            const rowY = doc.y;
            doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
            doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
              width: totalTableWidth - cellPadding * 2,
              align: 'center',
            });
            doc.y = rowY + itemHeight;
          } else {
            for (let idx = 0; idx < group.length; idx++) {
            const row = group[idx];
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            const cellTexts = [
              String(idx + 1),
              row.cabinet_name ?? '-',
              row.department_name ?? '-',
              row.quantity_display ?? '-',
              row.status ?? '-',
              row.description ?? '-',
            ];

            // ขึ้นหน้าใหม่ถ้าไม่พอ
            if (doc.y + itemHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
              doc.y = margin;
              const newHeaderY = doc.y;
              drawTableHeader(newHeaderY);
              doc.y = newHeaderY + itemHeight;
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const currentRowY = doc.y;
            let xPos = margin;
            for (let i = 0; i < 6; i++) {
              doc.rect(xPos, currentRowY, colWidths[i], itemHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(12).font(finalFontName).fillColor('#000000');
              doc.text(String(cellTexts[i]), xPos + cellPadding, currentRowY + cellPadding, {
                width: Math.max(4, colWidths[i] - cellPadding * 2),
                align: i === 1 || i === 2 || i === 5 ? 'left' : 'center',
              });
              xPos += colWidths[i];
            }
            doc.y = currentRowY + itemHeight;

            // Subdata: รายการอุปกรณ์ในตู้ — วาดต่อจากแถวหลักทันที (ไม่ขึ้นหน้าใหม่ล่วงหน้า)
            const subRows = row.subRows ?? [];
            const totalChips = subRows.reduce(
              (sum: number, s: { totalQty?: number }) => sum + (s.totalQty ?? 0),
              0,
            );

            const labelY = doc.y;
            doc.rect(margin, labelY, totalTableWidth, subRowHeight).fillAndStroke(
              '#E9ECEF',
              '#DEE2E6',
            );
            doc.fontSize(11).font(finalFontBoldName).fillColor('#000000');
            doc.text(
              `  รายการอุปกรณ์ในตู้ (${subRows.length} รายการ, รวม ${totalChips} ชิ้น)`,
              margin + cellPadding,
              labelY + 6,
              {
                width: totalTableWidth - cellPadding * 2,
                align: 'left',
              },
            );
            doc.fillColor('#000000');
            doc.y = labelY + subRowHeight;

            // Header ของตารางย่อย (หัวสีดำ) — ต่อเนื่องเมื่อล้นหน้าใช้ drawSubTableHeader
            const subHeaderY = doc.y;
            if (subHeaderY + subRowHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
              doc.y = margin;
              drawSubTableHeader(doc.y);
              doc.y += subRowHeight;
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }
            const actualSubHeaderY = doc.y;
            drawSubTableHeader(actualSubHeaderY);
            doc.y = actualSubHeaderY + subRowHeight;

            subRows.forEach(
              (sub: {
                seq: number;
                itemcode: string;
                itemname: string;
                inStockCount: number;
                dispensedCount: number;
                totalQty: number;
              }) => {
                if (doc.y + subRowHeight > pageHeight - 35) {
                  doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
                  doc.y = margin;
                  drawSubTableHeader(doc.y);
                  doc.y += subRowHeight;
                  doc.fontSize(13).font(finalFontName).fillColor('#000000');
                }
                const subY = doc.y;
                const subTexts = [
                  String(sub.seq),
                  sub.itemcode ?? '-',
                  sub.itemname ?? '-',
                  String(sub.inStockCount),
                  String(sub.dispensedCount),
                  String(sub.totalQty),
                ];
                xPos = margin;
                doc.fontSize(11).font(finalFontName);
                for (let i = 0; i < 6; i++) {
                  doc.rect(xPos, subY, colWidths[i], subRowHeight).fillAndStroke('#FFFFFF', '#DEE2E6');
                  doc.fillColor('#000000');
                  doc.text(String(subTexts[i]), xPos + cellPadding, subY + 5, {
                    width: Math.max(4, colWidths[i] - cellPadding * 2),
                    align: i === 1 || i === 2 ? 'left' : 'center',
                  });
                  xPos += colWidths[i];
                }
                doc.y = subY + subRowHeight;
              },
            );
            }
          }
        }

        // หมายเหตุ (รูปแบบเดียวกับ dispensed-items)
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(
          `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`,
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
