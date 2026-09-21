import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { CancelBillReportData } from './cancel-bill-report-excel.service';
import { getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

export type { CancelBillReportData };

@Injectable()
export class CancelBillReportPdfService {
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
   * Generate cancel bill report in PDF format
   */
  async generateReport(data: CancelBillReportData): Promise<Buffer> {
    try {
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data structure: data.data must be an array');
      }

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
         .text('รายงานยกเลิก Bill', 35, headerTop, { 
           align: 'center', 
           width: doc.page.width - 70 
         });
      
      doc.fillColor('#000000');
      doc.y = headerTop + 35;

      // Filters Box - Clean design with consistent spacing
      if (data.filters && (data.filters.startDate || data.filters.endDate)) {
        const filterBoxY = doc.y;
        const filterBoxPadding = 10;
        const filterHeaderHeight = 20;
        const filterBoxHeight = 40;
        doc.rect(35, filterBoxY, doc.page.width - 70, filterBoxHeight)
           .fillAndStroke('#F8F9FA', '#E0E0E0');
        
        // Filter Info Header - subtle background
        doc.rect(35, filterBoxY, doc.page.width - 70, filterHeaderHeight)
           .fill('#F0F0F0');
        
        doc.fontSize(12)
           .font(finalFontBoldName)
           .fillColor('#2C3E50')
           .text('เงื่อนไขการค้นหา', 35 + filterBoxPadding, filterBoxY + 5);
        
        // Filter details
        doc.fontSize(10)
           .font(finalFontName)
           .fillColor('#333333');
        
        const leftColX = 35 + filterBoxPadding;
        const labelWidth = 80;
        let currentY = filterBoxY + filterHeaderHeight + 8;
        
        if (data.filters.startDate || data.filters.endDate) {
          doc.font(finalFontBoldName)
             .fillColor('#2C3E50')
             .text('วันที่:', leftColX, currentY);
          doc.font(finalFontName)
             .fillColor('#333333')
             .text(`${data.filters.startDate || ''} ถึง ${data.filters.endDate || ''}`, leftColX + labelWidth, currentY);
        }
        
        doc.y = filterBoxY + filterBoxHeight + 15;
      }

      // Summary Box - Clean design with consistent spacing
      const summaryBoxY = doc.y;
      const summaryBoxPadding = 10;
      const summaryHeaderHeight = 20;
      const summaryBoxHeight = 50;
      doc.rect(35, summaryBoxY, doc.page.width - 70, summaryBoxHeight)
         .fillAndStroke('#F8F9FA', '#E0E0E0');
      
      // Summary header - subtle background
      doc.rect(35, summaryBoxY, doc.page.width - 70, summaryHeaderHeight)
         .fill('#F0F0F0');
      
      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('สรุปผล (Summary)', 35 + summaryBoxPadding, summaryBoxY + 5);
      
      // Summary details
      const summaryStartY = summaryBoxY + summaryHeaderHeight + 10;
      const summaryLeftX = 35 + summaryBoxPadding;
      const summaryRightX = doc.page.width / 2 + 5;
      const summaryLabelWidth = 120;
      
      doc.fontSize(10)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('จำนวน Bill ที่ยกเลิก:', summaryLeftX, summaryStartY);
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333')
         .text(`${data.summary.total_cancelled_bills} Bill`, summaryLeftX + summaryLabelWidth, summaryStartY);
      
      doc.fontSize(10)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('จำนวนรายการที่ยกเลิก:', summaryRightX, summaryStartY);
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333')
         .text(`${data.summary.total_cancelled_items} รายการ`, summaryRightX + summaryLabelWidth, summaryStartY);
      
      doc.y = summaryBoxY + summaryBoxHeight + 15;

      // Table Header - consistent spacing
      const startY = doc.y;
      const tableTop = startY + 2;
      const itemHeight = 22;
      const pageWidth = doc.page.width - 70; // A4 portrait: 595 - 70 = 525pt
      
      // Calculate column widths
      const colWidths = [
        30,   // ลำดับ
        50,   // EN
        50,   // HN
        80,   // ชื่อคนไข้
        60,   // วันที่ Print
        60,   // วันที่ยกเลิก
        60,   // รหัสอุปกรณ์
        100,  // ชื่ออุปกรณ์
        40,   // จำนวน
        50    // สถานะ
      ];
      
      // Verify total width matches pageWidth
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
      if (Math.abs(totalWidth - pageWidth) > 10) {
        const diff = pageWidth - totalWidth;
        colWidths[6] += diff; // Adjust item code column
      }
      
      const headers = ['ลำดับ', 'EN', 'HN', 'ชื่อคนไข้', 'วันที่ Print', 'วันที่ยกเลิก', 'รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'จำนวน', 'สถานะ'];

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

      // Draw table rows - Flatten cancelled_items
      let yPos = tableTop + itemHeight;
      let rowIndex = 0;

      data.data.forEach((record) => {
        if (record.cancelled_items && record.cancelled_items.length > 0) {
          record.cancelled_items.forEach((item, itemIndex) => {
            const isFirstItem = itemIndex === 0;
            
            // Check if we need a new page
            if (yPos > doc.page.height - 120) {
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
              isFirstItem ? (rowIndex + 1).toString() : '',
              isFirstItem ? record.en : '',
              isFirstItem ? record.patient_hn : '',
              isFirstItem ? record.patient_name : '',
              isFirstItem ? (record.print_date ? formatReportDateOnly(record.print_date) : '-') : '',
              isFirstItem ? formatReportDateOnly(record.created_at) : '',
              item.item_code,
              item.item_name,
              item.qty.toString(),
              'ยกเลิก',
            ];

            // Alternate row background with elegant contrast
            const isEvenRow = rowIndex % 2 === 0;
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
                align: i === 0 || i === 1 || i === 2 || i === 4 || i === 5 || i === 8 || i === 9 ? 'center' : 'left',
                lineBreak: false,
                ellipsis: true,
              });
              xPos += colWidths[i];
            });
            doc.fillColor('#000000');

            yPos += itemHeight;
            rowIndex++;
          });
        } else {
          // If no cancelled items, still show the record
          if (yPos > doc.page.height - 120) {
            doc.addPage({ layout: 'portrait', margin: 35 });
            
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
            (rowIndex + 1).toString(),
            record.en,
            record.patient_hn,
            record.patient_name,
            record.print_date ? formatReportDateOnly(record.print_date) : '-',
            formatReportDateOnly(record.created_at),
            '-',
            '-',
            '0',
            'ยกเลิก',
          ];

          const isEvenRow = rowIndex % 2 === 0;
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
              align: i === 0 || i === 1 || i === 2 || i === 4 || i === 5 || i === 8 || i === 9 ? 'center' : 'left',
              lineBreak: false,
              ellipsis: true,
            });
            xPos += colWidths[i];
          });
          doc.fillColor('#000000');

          yPos += itemHeight;
          rowIndex++;
        }
      });

      // Footer with elegant decorative line
      const footerY = yPos + 15;
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

