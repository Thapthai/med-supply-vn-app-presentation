import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { EquipmentDisbursementReportData } from '../types/equipment-disbursement-report.types';
import { getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

export type { EquipmentDisbursementReportData };

@Injectable()
export class EquipmentDisbursementPdfService {
  /**
   * Not using Tahoma - using Thai fonts from project only
   */
  private async registerTahomaFont(doc: PDFKit.PDFDocument): Promise<boolean> {
    return false;
  }

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

  /**
   * Generate equipment disbursement report in PDF format
   */
  async generateReport(data: EquipmentDisbursementReportData): Promise<Buffer> {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        layout: 'portrait',
        margin: 35,
      });

      const chunks: Buffer[] = [];

      // Try to register Tahoma first (supports Thai and Unicode)
      let finalFontName = 'Helvetica';
      let finalFontBoldName = 'Helvetica-Bold';
      
      try {
        const hasTahoma = await this.registerTahomaFont(doc);
        if (hasTahoma) {
          finalFontName = 'Tahoma';
          finalFontBoldName = 'Tahoma-Bold';
        } else {
          const hasThaiFont = await this.registerThaiFont(doc);
          if (hasThaiFont) {
            finalFontName = 'ThaiFont';
            finalFontBoldName = 'ThaiFontBold';
          }
        }
      } catch (fontError) {
        console.warn('[PDF Service] Font registration error, using Helvetica:', fontError);
        finalFontName = 'Helvetica';
        finalFontBoldName = 'Helvetica-Bold';
      }

      return new Promise((resolve, reject) => {
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => {
          console.error('[PDF Service] PDF generation error:', error);
          reject(error);
        });

        try {
      
      // Header - Clean design without background color
      const headerTop = 40;
      doc.fontSize(20)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('รายงานการรับบันทึกตัดจ่ายอุปกรณ์', 35, headerTop, { 
           align: 'center', 
           width: doc.page.width - 70 
         });
      
      doc.fillColor('#000000');
      doc.y = headerTop + 35;

      // Hospital Information Section
      const hospitalBoxY = doc.y;
      const hospitalBoxPadding = 10;
      const hospitalHeaderHeight = 20;
      const hospitalBoxHeight = 70;
      doc.rect(35, hospitalBoxY, doc.page.width - 70, hospitalBoxHeight)
         .fillAndStroke('#F8F9FA', '#E0E0E0');
      
      doc.rect(35, hospitalBoxY, doc.page.width - 70, hospitalHeaderHeight)
         .fill('#F0F0F0');
      
      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('ข้อมูลโรงพยาบาล', 35 + hospitalBoxPadding, hospitalBoxY + 5);
      
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333');
      
      const leftColX = 35 + hospitalBoxPadding;
      const lineHeight = 15;
      let currentY = hospitalBoxY + hospitalHeaderHeight + 8;
      
      const labelWidth = 70;
      
      if (data.hospital) {
        doc.font(finalFontBoldName)
           .fillColor('#2C3E50')
           .text('โรงพยาบาล:', leftColX, currentY);
        doc.font(finalFontName)
           .fillColor('#333333')
           .text(data.hospital, leftColX + labelWidth, currentY);
        currentY += lineHeight;
      }
      
      if (data.department) {
        doc.font(finalFontBoldName)
           .fillColor('#2C3E50')
           .text('หน่วยงาน/แผนก:', leftColX, currentY);
        doc.font(finalFontName)
           .fillColor('#333333')
           .text(data.department, leftColX + labelWidth, currentY);
        currentY += lineHeight;
      }
      
      if (data.dateFrom || data.dateTo) {
        const dateRangeText = data.dateFrom && data.dateTo
          ? `ตั้งแต่วันที่ ${formatReportDateOnly(data.dateFrom)} ถึง ${formatReportDateOnly(data.dateTo)}`
          : data.dateFrom
            ? `ตั้งแต่วันที่ ${formatReportDateOnly(data.dateFrom)}`
            : data.dateTo
              ? `จนถึงวันที่ ${formatReportDateOnly(data.dateTo)}`
              : 'ทุกช่วงเวลา';
        doc.font(finalFontBoldName)
           .fillColor('#2C3E50')
           .text('วันที่:', leftColX, currentY);
        doc.font(finalFontName)
           .fillColor('#333333')
           .text(dateRangeText, leftColX + labelWidth, currentY);
      }
      
      doc.y = hospitalBoxY + hospitalBoxHeight + 15;

      // Main Table Header
      const startY = doc.y;
      const tableTop = startY + 2;
      const itemHeight = 22;
      const pageWidth = doc.page.width - 70;
      
      const colWidths = [
        100,  // รหัสอุปกรณ์
        200,  // อุปกรณ์
        80,   // วันที่
        70,   // เวลา
        75    // ผู้บันทึก
      ];
      
      const headers = ['รหัสอุปกรณ์', 'อุปกรณ์', 'วันที่', 'เวลา', 'ผู้บันทึก'];

      // Draw table header
      const cellPadding = 3;
      doc.fontSize(9).font(finalFontBoldName);
      let xPos = 35;
      headers.forEach((header, i) => {
        doc.rect(xPos, tableTop, colWidths[i], itemHeight)
           .fillAndStroke('#E8E8E8', '#CCCCCC');
        doc.fillColor('#2C3E50')
           .text(header, xPos + cellPadding, tableTop + 6, { width: colWidths[i] - cellPadding * 2, align: 'center' });
        xPos += colWidths[i];
      });
      doc.fillColor('#000000');

      // Draw table rows
      let yPos = tableTop + itemHeight;

      data.records.forEach((record, index) => {
        // Check if we need a new page
        if (yPos + itemHeight > doc.page.height - 200) {
          doc.addPage({ layout: 'portrait', margin: 35 });
          
          // Redraw header on new page
          doc.fontSize(9).font(finalFontBoldName);
          let xPosHeader = 35;
          headers.forEach((header, i) => {
            doc.rect(xPosHeader, 35, colWidths[i], itemHeight)
               .fillAndStroke('#E8E8E8', '#CCCCCC');
            doc.fillColor('#2C3E50')
               .text(header, xPosHeader + cellPadding, 43, { width: colWidths[i] - cellPadding * 2, align: 'center' });
            xPosHeader += colWidths[i];
          });
          doc.fillColor('#000000');
          yPos = 35 + itemHeight;
        }

        const rowData = [
          record.code,
          record.description,
          record.date,
          record.time,
          record.recordedBy || '-',
        ];

        // Alternate row background
        const isEvenRow = index % 2 === 0;
        if (isEvenRow) {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#F8F9FA');
        } else {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#FFFFFF');
        }
        
        doc.fontSize(8.5).font(finalFontName);
        xPos = 35;
        rowData.forEach((dataText, i) => {
          doc.rect(xPos, yPos, colWidths[i], itemHeight).stroke('#E0E0E0');
          doc.fillColor('#333333');
          
          doc.text(dataText, xPos + cellPadding, yPos + 6, { 
            width: colWidths[i] - cellPadding * 2, 
            align: i === 0 || i === 2 || i === 3 ? 'center' : 'left',
            lineBreak: false,
            ellipsis: true,
          });
          xPos += colWidths[i];
        });
        doc.fillColor('#000000');

        yPos += itemHeight;
      });

      // Summary Section
      yPos += 20;
      
      // Check if summary fits on current page
      const summaryTableHeight = 30 + (data.summary.length * 22) + 30; // header + rows + footer
      if (yPos + summaryTableHeight > doc.page.height - 40) {
        doc.addPage({ layout: 'portrait', margin: 35 });
        yPos = 35;
      }

      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('ผลรวม', 35, yPos);
      
      yPos += 20;

      // Summary Table Header
      const summaryColWidths = [
        100,  // รหัสอุปกรณ์
        300,  // อุปกรณ์
        75    // ผลรวม
      ];
      
      const summaryHeaders = ['รหัสอุปกรณ์', 'อุปกรณ์', 'ผลรวม'];

      doc.fontSize(9).font(finalFontBoldName);
      xPos = 35;
      summaryHeaders.forEach((header, i) => {
        doc.rect(xPos, yPos, summaryColWidths[i], itemHeight)
           .fillAndStroke('#E8E8E8', '#CCCCCC');
        doc.fillColor('#2C3E50')
           .text(header, xPos + cellPadding, yPos + 6, { width: summaryColWidths[i] - cellPadding * 2, align: 'center' });
        xPos += summaryColWidths[i];
      });
      doc.fillColor('#000000');

      yPos += itemHeight;

      // Summary data rows
      data.summary.forEach((item, index) => {
        const rowData = [
          item.code,
          item.description,
          item.totalQty.toString(),
        ];

        const isEvenRow = index % 2 === 0;
        if (isEvenRow) {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#F8F9FA');
        } else {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#FFFFFF');
        }
        
        doc.fontSize(8.5).font(finalFontName);
        xPos = 35;
        rowData.forEach((dataText, i) => {
          doc.rect(xPos, yPos, summaryColWidths[i], itemHeight).stroke('#E0E0E0');
          doc.fillColor('#333333');
          
          doc.text(dataText, xPos + cellPadding, yPos + 6, { 
            width: summaryColWidths[i] - cellPadding * 2, 
            align: i === 0 || i === 2 ? 'center' : 'left',
            lineBreak: false,
            ellipsis: true,
          });
          xPos += summaryColWidths[i];
        });
        doc.fillColor('#000000');

        yPos += itemHeight;
      });

      // Footer with elegant decorative line - positioned right after summary
      yPos += 15;
      doc.rect(35, yPos - 3, doc.page.width - 70, 2)
         .fill('#BDC3C7');
      
      doc.fontSize(8)
         .font(finalFontName)
         .fillColor('#7F8C8D')
         .text(`สร้างเมื่อ: ${formatReportDateTime(new Date())}`, 35, yPos, { 
           align: 'center', 
           width: doc.page.width - 70 
         });

        doc.end();
        } catch (error) {
          console.error('[PDF Service] Error during PDF generation:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[PDF Service] Error setting up PDF generation:', error);
      throw error;
    }
  }
}

