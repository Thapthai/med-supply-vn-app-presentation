import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

export type CabinetTempHumChartPdfPoint = {
  create_date: Date | string;
  temp_log: number | null;
  hum_log: number | null;
};

export type CabinetTempHumChartPdfData = {
  cabinet_name: string;
  year: number;
  month: number;
  month_label: string;
  points: CabinetTempHumChartPdfPoint[];
};

const LINE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6', '#f97316', '#64748b'];

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toUtcDate(value: Date | string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLogTime(value: Date | string) {
  const d = toUtcDate(value);
  if (!d) return '';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function utcYmd(value: Date | string) {
  const d = toUtcDate(value);
  if (!d) return null;
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function niceStep(raw: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.1))));
  const err = raw / exp;
  if (err <= 1) return 1 * exp;
  if (err <= 2) return 2 * exp;
  if (err <= 5) return 5 * exp;
  return 10 * exp;
}

function niceDomain(minT: number, maxT: number) {
  const mid = (minT + maxT) / 2;
  const half = Math.max((maxT - minT) / 2 + 0.6, 1.4);
  const yMin = mid - half;
  const yMax = mid + half;
  const step = niceStep((yMax - yMin) / 5);
  const start = Math.floor(yMin / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= yMax + step * 0.01; v += step) {
    ticks.push(Number(v.toFixed(2)));
  }
  const first = ticks[0] ?? yMin;
  const last = ticks[ticks.length - 1] ?? yMax;
  return { yMin: Math.min(first, yMin), yMax: Math.max(last, yMax), ticks };
}

type TimeSeries = {
  time: string;
  color: string;
  points: { day: number; value: number }[];
};

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

function buildTimeSeries(
  points: CabinetTempHumChartPdfPoint[],
  year: number,
  month: number,
  metric: 'temp' | 'hum',
): TimeSeries[] {
  const byTime = new Map<string, { day: number; value: number }[]>();
  for (const point of points) {
    const ymd = utcYmd(point.create_date);
    if (!ymd || ymd.y !== year || ymd.m !== month) continue;
    const time = formatLogTime(point.create_date);
    const value = metric === 'temp' ? point.temp_log : point.hum_log;
    if (value == null || Number.isNaN(value)) continue;
    const list = byTime.get(time) ?? [];
    const existing = list.find((item) => item.day === ymd.day);
    if (existing) existing.value = value;
    else list.push({ day: ymd.day, value });
    byTime.set(time, list);
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, seriesPoints], i) => ({
      time,
      color: LINE_COLORS[i % LINE_COLORS.length],
      points: seriesPoints.sort((a, b) => a.day - b.day),
    }));
}

@Injectable()
export class CabinetTempHumChartPdfService {
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

  async generateReport(data: CabinetTempHumChartPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      // margin: { top: 10, left: 10, right: 10, bottom: 0 },
      bufferPages: true,
    });
    const nativeAddPage = doc.addPage.bind(doc);
    doc.addPage = ((options?: unknown) => {
      if ((doc as { _allowAddPage?: boolean })._allowAddPage) {
        return nativeAddPage(options as never);
      }
      return doc;
    }) as typeof doc.addPage;
    const addLockedPage = () => {
      (doc as { _allowAddPage?: boolean })._allowAddPage = true;
      nativeAddPage({ size: 'A4', layout: 'landscape', margin: { top: 10, left: 10, right: 10, bottom: 0 } });
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
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const headerTop = 20;
        const headerHeight = 48;
        const filterRowHeight = 34;
        const chartTop = headerTop + headerHeight + 16 + 16 + filterRowHeight + 8;
        const footerY = pageHeight - 16;
        const chartHeight = footerY - 14 - chartTop;
        const fonts = { regular: finalFontName, bold: finalFontBoldName };
        const charts: Array<{ metric: 'temp' | 'hum'; label: string }> = [
          { metric: 'temp', label: 'อุณหภูมิ (°C)' },
          { metric: 'hum', label: 'ความชื้น (%)' },
        ];

        const drawHeader = (metricLabel: string) => {
          doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          if (logoBuffer && logoBuffer.length > 0) {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
            } catch {
              // skip
            }
          }
          doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
          writeText(doc, 'รายงานกราฟอุณหภูมิและความชื้นในตู้', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          writeText(doc, 'Cabinet Temperature & Humidity Chart Report', margin, headerTop + 22, {
            width: contentWidth,
            align: 'center',
          });
          writeText(doc, `วันที่รายงาน: ${reportDate}`, margin, headerTop + headerHeight + 6, {
            width: contentWidth,
            align: 'right',
          });

          const filterY = headerTop + headerHeight + 16;
          const filterCells = [
            { label: 'เดือน', value: data.month_label },
            { label: 'ตู้', value: data.cabinet_name },
            { label: 'กราฟ', value: metricLabel },
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
            writeText(doc, fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
            doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
            writeText(doc, fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
            fx += cw;
          });
          doc.x = margin;
          doc.y = chartTop;
        };

        charts.forEach((chart, index) => {
          if (index > 0) addLockedPage();
          drawHeader(chart.label);
          this.drawChart(doc, {
            ...data,
            metric: chart.metric,
            title: chart.label,
            fonts,
            x: margin,
            y: chartTop,
            width: contentWidth,
            height: chartHeight,
          });
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          writeText(doc, 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, footerY, {
            width: contentWidth - 80,
            align: 'left',
          });
          writeText(doc, `${index + 1} / ${charts.length}`, margin, footerY, {
            width: contentWidth,
            align: 'right',
          });
          doc.x = margin;
          doc.y = chartTop;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private drawChart(
    doc: PDFKit.PDFDocument,
    opts: CabinetTempHumChartPdfData & {
      metric: 'temp' | 'hum';
      title: string;
      fonts: { regular: string; bold: string };
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) {
    const { year, month, metric, title, fonts, x, y, width, height, points } = opts;
    const series = buildTimeSeries(points, year, month, metric);
    const dayCount = daysInMonth(year, month);
    const axisColor = '#1A365D';
    const lineAccent = metric === 'temp' ? '#C05621' : '#2B6CB0';
    const unit = metric === 'temp' ? '°C' : '%';
    const legendW = 78;
    const padL = 48;
    const padR = 12;
    const padT = 28;
    const padB = 36;
    const plotX = x + padL;
    const plotY = y + padT;
    const plotW = width - padL - padR - legendW;
    const plotH = height - padT - padB;
    const values = series.flatMap((s) => s.points.map((p) => p.value));
    const domain = values.length
      ? niceDomain(Math.min(...values), Math.max(...values))
      : { yMin: 0, yMax: 1, ticks: [0, 1] };
    const xAt = (day: number) =>
      dayCount <= 1 ? plotX + plotW / 2 : plotX + ((day - 1) / (dayCount - 1)) * plotW;
    const yAt = (value: number) =>
      plotY + ((domain.yMax - value) / Math.max(domain.yMax - domain.yMin, 0.1)) * plotH;

    doc.rect(x, y, width, height).fillAndStroke('#FFFFFF', '#DEE2E6');
    doc.rect(x, y, width, 22).fill('#1A365D');
    doc.font(fonts.bold).fontSize(13).fillColor('#FFFFFF');
    writeText(doc, title, x + 8, y + 5, { width: width - 16, align: 'center' });

    doc.font(fonts.bold).fontSize(11).fillColor(axisColor);
    writeText(doc, unit, x + 4, plotY - 2, { width: 36, align: 'left' });

    domain.ticks.forEach((tick) => {
      const ty = yAt(tick);
      doc.save();
      doc.strokeColor('#DEE2E6').lineWidth(0.7).dash(4, { space: 5 });
      doc.moveTo(plotX, ty).lineTo(plotX + plotW, ty).stroke();
      doc.restore();
      doc.font(fonts.regular).fontSize(11).fillColor(axisColor);
      writeText(doc, tick.toFixed(1), x + 4, ty - 7, { width: padL - 10, align: 'right' });
    });

    if (series.length === 0) {
      doc.font(fonts.regular).fontSize(13).fillColor('#6C757D');
      writeText(doc, 'ไม่มีข้อมูลกราฟในเดือนนี้', plotX, plotY + plotH / 2 - 8, {
        width: plotW,
        align: 'center',
      });
    } else {
      series.forEach((s) => {
        const xs = s.points.map((p) => xAt(p.day));
        const ys = s.points.map((p) => yAt(p.value));
        doc.save();
        doc.strokeColor(s.color).lineWidth(2.2).lineCap('round').lineJoin('round');
        doc.moveTo(xs[0], ys[0]);
        if (xs.length === 2) {
          doc.lineTo(xs[1], ys[1]);
        } else if (xs.length > 2) {
          for (let i = 0; i < xs.length - 1; i++) {
            const cpx = (xs[i] + xs[i + 1]) / 2;
            doc.bezierCurveTo(cpx, ys[i], cpx, ys[i + 1], xs[i + 1], ys[i + 1]);
          }
        }
        doc.stroke();
        doc.restore();
        s.points.forEach((_, i) => {
          doc.circle(xs[i], ys[i], 3.2).fillAndStroke(s.color, '#FFFFFF');
        });
      });
    }

    for (let day = 1; day <= dayCount; day++) {
      doc.font(fonts.regular).fontSize(10).fillColor('#6C757D');
      writeText(doc, String(day), xAt(day) - 8, y + height - 26, { width: 16, align: 'center' });
    }
    doc.font(fonts.regular).fontSize(11).fillColor('#1A365D');
    writeText(doc, 'วันที่', plotX, y + height - 14, { width: plotW, align: 'center' });

    const legendX = plotX + plotW + 12;
    let legendY = plotY + 4;
    doc.font(fonts.bold).fontSize(11).fillColor('#1A365D');
    writeText(doc, 'เวลา', legendX, legendY, { width: legendW - 8 });
    legendY += 16;
    series.forEach((s) => {
      doc.rect(legendX, legendY + 3, 8, 8).fill(s.color);
      doc.font(fonts.regular).fontSize(11).fillColor('#212529');
      writeText(doc, s.time, legendX + 12, legendY, { width: legendW - 16 });
      legendY += 16;
    });
    doc.font(fonts.regular).fontSize(10).fillColor(lineAccent);
    writeText(doc, metric === 'temp' ? 'เส้น = อุณหภูมิ' : 'เส้น = ความชื้น', legendX, legendY + 6, {
      width: legendW - 8,
    });
    doc.x = x;
    doc.y = y;
  }
}
