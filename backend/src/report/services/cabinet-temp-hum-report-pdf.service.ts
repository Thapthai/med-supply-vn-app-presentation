import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  CabinetTempHumReportData,
  CabinetTempHumReportRow,
} from './cabinet-temp-hum-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function collectTimes(rows: CabinetTempHumReportRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const sub of row.subRows ?? []) {
      const time = (sub.log_time ?? '').trim();
      if (time && time !== '-') set.add(time);
    }
  }
  return [...set].sort();
}

function readingAt(row: CabinetTempHumReportRow, day: number, time: string) {
  return (row.subRows ?? []).find((sub) => sub.day === day && sub.log_time === time);
}

function writeText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options?: PDFKit.Mixins.TextOptions,
) {
  const prevX = doc.x;
  const prevY = doc.y;
  doc.text(text, x, y, { lineBreak: false, ...options });
  doc.x = prevX;
  doc.y = prevY;
}

@Injectable()
export class CabinetTempHumReportPdfService {
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

  async generateReport(data: CabinetTempHumReportData): Promise<Buffer> {
    const pageOptions = {
      size: 'A4' as const,
      layout: 'portrait' as const,
      margin: 16,
    };
    const doc = new PDFDocument({
      ...pageOptions,
      bufferPages: true,
    });
    const nativeAddPage = doc.addPage.bind(doc);
    doc.addPage = ((options?: unknown) => {
      if ((doc as { _allowAddPage?: boolean })._allowAddPage) {
        return nativeAddPage(options as never);
      }
      return doc;
    }) as typeof doc.addPage;
    const addPortraitPage = () => {
      (doc as { _allowAddPage?: boolean })._allowAddPage = true;
      nativeAddPage(pageOptions);
      (doc as { _allowAddPage?: boolean })._allowAddPage = false;
    };

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
        const margin = 16;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const footerY = pageHeight - 18;
        const summary = data?.summary ?? { total_rows: 0 };
        const rows = data?.data && Array.isArray(data.data) ? data.data : [];
        const filters = data.filters ?? {};
        const year = filters.year ?? new Date().getFullYear();
        const month = filters.month ?? new Date().getMonth() + 1;
        const times = collectTimes(rows);
        const timeSlots = times.length > 0 ? times : ['-'];
        const dayCount = daysInMonth(year, month);
        const dayColW = 52;
        const metricW = (contentWidth - dayColW) / 2;
        const timeW = metricW / timeSlots.length;
        const titleH = 22;
        const groupH = 18;
        const timeH = 16;
        const headerH = groupH + timeH;
        const rowH = 16;
        const pad = 2;

        const fillRect = (x: number, y: number, w: number, h: number, fill: string, stroke = '#DEE2E6') => {
          doc.rect(x, y, w, h).fillAndStroke(fill, stroke);
        };

        const cellText = (
          text: string,
          x: number,
          y: number,
          w: number,
          h: number,
          opts?: { align?: 'left' | 'center'; color?: string; size?: number; bold?: boolean },
        ) => {
          doc
            .font(opts?.bold ? finalFontBoldName : finalFontName)
            .fontSize(opts?.size ?? 10)
            .fillColor(opts?.color ?? '#212529');
          writeText(doc, text, x + pad, y + (h - (opts?.size ?? 10)) / 2 - 1, {
            width: Math.max(2, w - pad * 2),
            align: opts?.align ?? 'center',
          });
        };

        const drawTitleBlock = () => {
          const headerTop = 20;
          const headerHeight = 48;
          fillRect(margin, headerTop, contentWidth, headerHeight, '#F8F9FA');
          if (logoBuffer && logoBuffer.length > 0) {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [86, 41] });
            } catch {
              // skip
            }
          }
          doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
          writeText(doc, 'รายงานอุณหภูมิและความชื้นในตู้', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          writeText(doc, 'Cabinet Temperature & Humidity Report', margin, headerTop + 24, {
            width: contentWidth,
            align: 'center',
          });
          writeText(doc, `วันที่รายงาน: ${reportDate}`, margin, headerTop + headerHeight + 6, {
            width: contentWidth,
            align: 'right',
          });

          const filterY = headerTop + headerHeight + 16;
          const filterRowHeight = 34;
          const filterCells = [
            { label: 'เดือน', value: filters.month_label ?? 'ทั้งหมด' },
            { label: 'จำนวน', value: `${summary.total_rows} ตู้ / ${summary.total_logs ?? 0} บันทึก` },
          ];
          const filterColWidth = Math.floor(contentWidth / filterCells.length);
          let fx = margin;
          filterCells.forEach((fc, i) => {
            const cw =
              i === filterCells.length - 1
                ? contentWidth - filterColWidth * (filterCells.length - 1)
                : filterColWidth;
            fillRect(fx, filterY, cw, filterRowHeight, '#E8EDF2');
            doc.fontSize(11).font(finalFontBoldName).fillColor('#444444');
            writeText(doc, fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
            doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
            writeText(doc, fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
            fx += cw;
          });
          doc.x = margin;
          doc.y = filterY + filterRowHeight + 10;
        };

        const drawCompactHeader = (cabinetLabel?: string) => {
          fillRect(margin, margin, contentWidth, 20, '#F8F9FA');
          doc.fontSize(11).font(finalFontBoldName).fillColor('#1A365D');
          writeText(
            doc,
            cabinetLabel
              ? `รายงานอุณหภูมิและความชื้นในตู้  •  ${filters.month_label ?? ''}  •  ${cabinetLabel}`
              : `รายงานอุณหภูมิและความชื้นในตู้  •  ${filters.month_label ?? ''}`,
            margin + 6,
            margin + 4,
            { width: contentWidth - 12, align: 'left' },
          );
          doc.x = margin;
          doc.y = margin + 26;
        };

        const drawTableHeader = (y: number) => {
          fillRect(margin, y, dayColW, headerH, '#1A365D', '#1A365D');
          cellText('วันที่', margin, y, dayColW, headerH, {
            bold: true,
            size: 11,
            color: '#FFFFFF',
          });

          fillRect(margin + dayColW, y, metricW, groupH, '#FDBA74', '#FDBA74');
          cellText('อุณหภูมิ', margin + dayColW, y, metricW, groupH, {
            bold: true,
            size: 11,
            color: '#9A3412',
          });
          fillRect(margin + dayColW + metricW, y, metricW, groupH, '#7DD3FC', '#7DD3FC');
          cellText('ความชื้น', margin + dayColW + metricW, y, metricW, groupH, {
            bold: true,
            size: 11,
            color: '#075985',
          });

          timeSlots.forEach((time, i) => {
            const tx = margin + dayColW + i * timeW;
            const hx = margin + dayColW + metricW + i * timeW;
            fillRect(tx, y + groupH, timeW, timeH, '#FED7AA', '#FDBA74');
            cellText(time, tx, y + groupH, timeW, timeH, { size: 9, color: '#9A3412', bold: true });
            fillRect(hx, y + groupH, timeW, timeH, '#BAE6FD', '#7DD3FC');
            cellText(time, hx, y + groupH, timeW, timeH, { size: 9, color: '#075985', bold: true });
          });
        };

        const drawDayRow = (row: CabinetTempHumReportRow, day: number, y: number) => {
          const bg = day % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
          fillRect(margin, y, dayColW, rowH, bg);
          cellText(day === 1 ? `${day} (วันที่)` : String(day), margin, y, dayColW, rowH, {
            bold: true,
            size: 10,
          });
          timeSlots.forEach((time, i) => {
            const log = readingAt(row, day, time);
            const temp = log?.temp && log.temp !== '-' ? log.temp : '-';
            const hum = log?.hum && log.hum !== '-' ? log.hum : '-';
            const tx = margin + dayColW + i * timeW;
            const hx = margin + dayColW + metricW + i * timeW;
            fillRect(tx, y, timeW, rowH, bg);
            cellText(temp, tx, y, timeW, rowH, { size: 10, color: '#C2410C', bold: true });
            fillRect(hx, y, timeW, rowH, bg);
            cellText(hum, hx, y, timeW, rowH, { size: 10, color: '#0369A1', bold: true });
          });
        };

        const drawCabinetTitle = (row: CabinetTempHumReportRow, y: number) => {
          fillRect(margin, y, contentWidth, titleH, '#1A365D', '#1A365D');
          cellText(`ตู้ที่ ${row.seq}: ${row.cabinet_name}`, margin + 4, y, contentWidth - 8, titleH, {
            align: 'left',
            bold: true,
            size: 12,
            color: '#FFFFFF',
          });
        };

        const continuePage = (cabinetLabel?: string) => {
          addPortraitPage();
          drawCompactHeader(cabinetLabel);
        };

        const ensureSpace = (need: number, cabinetLabel?: string) => {
          if (doc.y + need <= footerY - 8) return;
          continuePage(cabinetLabel);
        };

        drawTitleBlock();

        if (rows.length === 0) {
          fillRect(margin, doc.y, contentWidth, 28, '#F8F9FA');
          cellText('ไม่มีข้อมูล', margin, doc.y, contentWidth, 28, { size: 12, color: '#6C757D' });
          doc.y += 36;
        } else {
          rows.forEach((row, cabinetIndex) => {
            const cabinetLabel = `ตู้ที่ ${row.seq}: ${row.cabinet_name}`;
            if (cabinetIndex > 0) continuePage(cabinetLabel);
            else ensureSpace(titleH + headerH + rowH + 8, cabinetLabel);
            drawCabinetTitle(row, doc.y);
            doc.y += titleH;
            drawTableHeader(doc.y);
            doc.y += headerH;
            for (let day = 1; day <= dayCount; day++) {
              ensureSpace(rowH, cabinetLabel);
              if (doc.y === margin + 26) {
                drawTableHeader(doc.y);
                doc.y += headerH;
              }
              drawDayRow(row, day, doc.y);
              doc.y += rowH;
            }
            doc.y += 10;
          });
        }

        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(range.start + i);
          doc.fontSize(10).font(finalFontName).fillColor('#6C757D');
          writeText(doc, 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, footerY, {
            width: contentWidth - 70,
            align: 'left',
          });
          writeText(doc, `${i + 1} / ${range.count}`, margin, footerY, {
            width: contentWidth,
            align: 'right',
          });
          doc.x = margin;
          doc.y = margin + 26;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
