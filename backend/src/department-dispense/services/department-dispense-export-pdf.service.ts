import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { getReportThaiFontPaths, resolveReportLogoPath } from '../../report/config/report.config';
import { DepartmentDispenseExportData } from './department-dispense-export-excel.service';

function formatThDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

@Injectable()
export class DepartmentDispenseExportPdfService {
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

  async generateReport(data: DepartmentDispenseExportData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 10,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let fontName = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    const hasThai = await this.registerThaiFont(doc);
    if (hasThai) {
      fontName = 'ThaiFont';
      fontBold = 'ThaiFontBold';
      doc.font(fontBold).fontSize(13);
      doc.font(fontName).fontSize(13);
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - margin * 2;

        const drawHeader = () => {
          const headerTop = 35;
          const headerHeight = 48;
          doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

          if (logoBuffer?.length) {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
            } catch {
              /* skip logo */
            }
          }

          doc.fontSize(16).font(fontBold).fillColor('#1A365D');
          doc.text('เอกสารควบคุมการเบิกอุปกรณ์ให้หน่วยงาน', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(fontName).fillColor('#6C757D');
          doc.text('Department Dispense Documents', margin, headerTop + 22, {
            width: contentWidth,
            align: 'center',
          });
          doc.fillColor('#000000');
          doc.y = headerTop + headerHeight + 10;
          doc.fontSize(10).font(fontName).fillColor('#6C757D');
          doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
            width: contentWidth,
            align: 'right',
          });
          doc.fillColor('#000000');
          doc.y += 8;
        };

        const ensureSpace = (needed: number) => {
          const bottom = doc.page.height - margin;
          if (doc.y + needed > bottom) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
            drawHeader();
          }
        };

        drawHeader();

        doc.fontSize(12).font(fontBold).text('สรุปเอกสาร', margin, doc.y);
        doc.y += 6;

        const summaryCols = [
          { label: 'เลขที่', width: 0.16 },
          { label: 'หน่วยงาน', width: 0.28 },
          { label: 'รายการ', width: 0.08 },
          { label: 'วันที่', width: 0.22 },
          { label: 'หมายเหตุ', width: 0.26 },
        ];

        const drawTableHeader = (cols: Array<{ label: string; width: number }>) => {
          ensureSpace(24);
          const rowY = doc.y;
          const rowH = 20;
          let x = margin;
          doc.rect(margin, rowY, contentWidth, rowH).fillAndStroke('#1A365D', '#1A365D');
          cols.forEach((col) => {
            const w = contentWidth * col.width;
            doc.fontSize(9).font(fontBold).fillColor('#FFFFFF');
            doc.text(col.label, x + 2, rowY + 5, { width: w - 4, align: 'center' });
            x += w;
          });
          doc.fillColor('#000000');
          doc.y = rowY + rowH;
        };

        const drawTableRow = (
          values: string[],
          cols: Array<{ label: string; width: number }>,
          alt: boolean,
        ) => {
          ensureSpace(22);
          const rowY = doc.y;
          const rowH = 18;
          if (alt) {
            doc.rect(margin, rowY, contentWidth, rowH).fill('#F8F9FA');
          }
          let x = margin;
          values.forEach((val, i) => {
            const w = contentWidth * cols[i].width;
            doc.fontSize(8).font(fontName).fillColor('#212529');
            doc.text(val || '—', x + 2, rowY + 4, {
              width: w - 4,
              align: i === 1 || i === 2 || i === 4 ? 'left' : 'center',
              ellipsis: true,
            });
            x += w;
          });
          doc.y = rowY + rowH;
        };

        drawTableHeader(summaryCols);
        data.documents.forEach((docRow, idx) => {
          drawTableRow(
            [
              docRow.doc_no,
              docRow.department_label,
              String(docRow.line_count),
              formatThDateTime(docRow.created_at),
              docRow.remark?.trim() || '—',
            ],
            summaryCols,
            idx % 2 === 1,
          );
        });

        doc.y += 14;
        doc.fontSize(12).font(fontBold).text('รายละเอียดรายการ', margin, doc.y);
        doc.y += 6;

        const detailCols = [
          { label: 'เลขที่', width: 0.18 },
          { label: 'รหัส', width: 0.16 },
          { label: 'ชื่อ', width: 0.34 },
          { label: 'จำนวน', width: 0.1 },
          { label: 'หน่วยงาน', width: 0.22 },
        ];

        drawTableHeader(detailCols);
        let detailIdx = 0;
        for (const docRow of data.documents) {
          for (const line of docRow.lines) {
            drawTableRow(
              [
                docRow.doc_no,
                line.itemcode,
                line.item_name ?? '—',
                String(line.qty),
                docRow.department_label,
              ],
              detailCols,
              detailIdx % 2 === 1,
            );
            detailIdx++;
          }
        }

        doc.y += 10;
        ensureSpace(20);
        doc.fontSize(9).font(fontName).fillColor('#6C757D');
        doc.text(
          `จำนวนเอกสาร: ${data.summary.total_documents} · รวมรายการ: ${data.summary.total_lines}`,
          margin,
          doc.y,
          { width: contentWidth, align: 'center' },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
