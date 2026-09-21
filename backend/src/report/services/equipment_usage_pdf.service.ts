import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { EquipmentUsageReportData } from '../types/equipment-usage-report.types';
import { getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

export type { EquipmentUsageReportData };

@Injectable()
export class EquipmentUsagePdfService {
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
   * Generate equipment usage report in PDF format
   */
  async generateReport(data: EquipmentUsageReportData): Promise<Buffer> {
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
          // Try Thai font as fallback
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
         .text('รายงานการใช้อุปกรณ์กับคนไข้', 35, headerTop, { 
           align: 'center', 
           width: doc.page.width - 70 
         })
         .fontSize(17)
         .text('Medical Equipment Usage Report', 35, headerTop + 22, { 
           align: 'center', 
           width: doc.page.width - 70 
         });
      
      doc.fillColor('#000000');
      doc.y = headerTop + 50;

      // Hospital Info Box - Clean design with consistent spacing
      const hospitalBoxY = doc.y;
      const hospitalBoxPadding = 10;
      const hospitalHeaderHeight = 20;
      const hospitalBoxHeight = 70;
      doc.rect(35, hospitalBoxY, doc.page.width - 70, hospitalBoxHeight)
         .fillAndStroke('#F8F9FA', '#E0E0E0');
      
      // Hospital Info Header - subtle background
      doc.rect(35, hospitalBoxY, doc.page.width - 70, hospitalHeaderHeight)
         .fill('#F0F0F0');
      
      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('ข้อมูลโรงพยาบาล', 35 + hospitalBoxPadding, hospitalBoxY + 5);
      
      // Hospital details in 2 columns
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333');
      
      const leftColX = 35 + hospitalBoxPadding;
      const rightColX = doc.page.width / 2 + 5;
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
           .text('แผนก:', leftColX, currentY);
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
           .text('ช่วงเวลา:', leftColX, currentY);
        doc.font(finalFontName)
           .fillColor('#333333')
           .text(dateRangeText, leftColX + labelWidth, currentY);
      }
      
      doc.y = hospitalBoxY + hospitalBoxHeight + 15;

      // Table Header - consistent spacing
      const startY = doc.y;
      const tableTop = startY + 2;
      const itemHeight = 22;
      const pageWidth = doc.page.width - 70; // A4 portrait: 595 - 70 = 525pt
      
      // Calculate column widths for equal and balanced proportions
      const colWidths = [
        35,   // No. (ลำดับ) - small for numbers
        60,   // EN - medium
        60,   // HN - medium
        80,   // Code (รหัส) - medium for codes
        155,  // Name (รายการ) - wider for item names
        80,   // Assession No. - medium
        60,   // Status (สถานะ) - medium for status text
        40    // Qty (จำนวน) - small for numbers
      ];
      
      // Verify total width matches pageWidth (should be ~525pt)
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
      if (Math.abs(totalWidth - pageWidth) > 10) {
        // Adjust if significantly off
        const diff = pageWidth - totalWidth;
        // Add difference to the widest column (Name)
        colWidths[4] += diff;
      }
      const headers = ['ลำดับ', 'EN', 'HN', 'รหัส', 'รายการ', 'Assession No.', 'สถานะ', 'จำนวน'];

      // Draw table header - clean styling with consistent padding
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

      data.items.forEach((item, index) => {
        // Check if we need a new page - be more conservative to avoid empty page 2
        if (yPos + itemHeight > doc.page.height - 120) {
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
          (index + 1).toString(),
          item.en || '-',
          item.hn,
          item.code,
          item.description,
          item.assessionNo || '-',
          item.status || '-',
          item.qty.toString(),
        ];

        // Alternate row background with elegant contrast
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
            align: i === 0 || i === 7 ? 'center' : 'left',
            lineBreak: false,
            ellipsis: true,
          });
          xPos += colWidths[i];
        });
        doc.fillColor('#000000');

        yPos += itemHeight;
      });

      // Summary Box - Clean vertical layout with consistent spacing
      yPos += 15;
      const summaryBoxPadding = 10;
      const summaryHeaderHeight = 20;
      const summaryBoxHeight = 50;
      const footerHeight = 30; // Space needed for footer
      
      // Check if summary + footer fits on current page, if not, move to next page
      const totalNeededHeight = summaryBoxHeight + footerHeight + 15; // 15 for spacing
      if (yPos + totalNeededHeight > doc.page.height - 40) {
        doc.addPage({ layout: 'portrait', margin: 35 });
        yPos = 35;
      }
      
      const summaryBoxY = yPos;
      doc.rect(35, summaryBoxY, pageWidth, summaryBoxHeight)
         .fillAndStroke('#F8F9FA', '#E0E0E0');
      
      // Summary header - subtle background
      doc.rect(35, summaryBoxY, pageWidth, summaryHeaderHeight)
         .fill('#F0F0F0');
      
      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('สรุปผล', 35 + summaryBoxPadding, summaryBoxY + 5);
      
      // Summary content
      const summaryStartY = summaryBoxY + summaryHeaderHeight + 8;
      const summaryLabelWidth = 75;
      
      const summaryLeftX = 35 + summaryBoxPadding;
      doc.fontSize(10)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('รวมทั้งหมด:', summaryLeftX, summaryStartY);
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333')
         .text(`${data.items.length} รายการ`, summaryLeftX + summaryLabelWidth, summaryStartY);

      // Footer with elegant decorative line - positioned right after summary
      const footerY = summaryBoxY + summaryBoxHeight + 15;
      doc.rect(35, footerY - 3, doc.page.width - 70, 2)
         .fill('#BDC3C7');
      
      doc.fontSize(8)
         .font(finalFontName)
         .fillColor('#7F8C8D')
         .text(`สร้างเมื่อ: ${formatReportDateTime(new Date())}`, 35, footerY, { 
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
