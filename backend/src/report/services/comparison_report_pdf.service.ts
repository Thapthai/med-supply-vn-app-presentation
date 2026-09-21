import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ComparisonReportData } from '../types/comparison-report.types';
import { getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateTime } from '../utils/date-timeformat';

export type { ComparisonReportData };

@Injectable()
export class ComparisonReportPdfService {
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
   * Generate comparison report in PDF format
   */
  async generateReport(data: ComparisonReportData): Promise<Buffer> {
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
         .text('รายงานเปรียบเทียบการเบิกอุปกรณ์', 35, headerTop, { 
           align: 'center', 
           width: doc.page.width - 70 
         })
         .fontSize(17)
         .text('และการบันทึกใช้กับคนไข้', 35, headerTop + 22, { 
           align: 'center', 
           width: doc.page.width - 70 
         });
      
      doc.fillColor('#000000');
      doc.y = headerTop + 50;

      // Patient Info Box - Clean design with consistent spacing
      const patientBoxY = doc.y;
      const patientBoxPadding = 10;
      const patientHeaderHeight = 20;
      const patientBoxHeight = 70;
      doc.rect(35, patientBoxY, doc.page.width - 70, patientBoxHeight)
         .fillAndStroke('#F8F9FA', '#E0E0E0');
      
      // Patient Info Header - subtle background
      doc.rect(35, patientBoxY, doc.page.width - 70, patientHeaderHeight)
         .fill('#F0F0F0');
      
      doc.fontSize(12)
         .font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('ข้อมูลผู้ป่วย', 35 + patientBoxPadding, patientBoxY + 5);
      
      // Patient details in 2 columns
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#333333');
      
      const leftColX = 35 + patientBoxPadding;
      const rightColX = doc.page.width / 2 + 5;
      const lineHeight = 15;
      let currentY = patientBoxY + patientHeaderHeight + 8;
      
      const labelWidth = 70;
      doc.font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('HN:', leftColX, currentY);
      doc.font(finalFontName)
         .fillColor('#333333')
         .text(data.usage.patient_hn, leftColX + labelWidth, currentY);
      
      doc.font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('ชื่อ-นามสกุล:', leftColX, currentY + lineHeight);
      doc.font(finalFontName)
         .fillColor('#333333')
         .text(`${data.usage.first_name} ${data.usage.lastname}`, leftColX + labelWidth, currentY + lineHeight);
      
      doc.font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('วันที่:', leftColX, currentY + lineHeight * 2);
      doc.font(finalFontName)
         .fillColor('#333333')
         .text(data.usage.usage_datetime ? formatReportDateTime(data.usage.usage_datetime) : '-', leftColX + labelWidth, currentY + lineHeight * 2);
      
      doc.font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('EN:', rightColX, currentY);
      doc.font(finalFontName)
         .fillColor('#333333')
         .text(data.usage.en || '-', rightColX + labelWidth, currentY);
      
      doc.font(finalFontBoldName)
         .fillColor('#2C3E50')
         .text('แผนก:', rightColX, currentY + lineHeight);
      doc.font(finalFontName)
         .fillColor('#333333')
         .text(data.usage.department_code || '-', rightColX + labelWidth, currentY + lineHeight);
      
      doc.y = patientBoxY + patientBoxHeight + 15;

      // Table Header - consistent spacing
      const startY = doc.y;
      const tableTop = startY + 2;
      const itemHeight = 22;
      const pageWidth = doc.page.width - 70; // A4 portrait: 595 - 70 = 525pt
      
      // Calculate column widths for equal and balanced proportions
      // Total width should match pageWidth (~525pt for A4 portrait)
      // Make numeric columns equal width for visual balance
      const colWidths = [
        35,   // No. (ลำดับ) - small for numbers
        80,   // Code (รหัส) - medium for codes
        155,  // Name (รายการ) - wider for item names
        44,   // Qty (เบิก) - equal width for numeric columns
        44,   // Used (ใช้) - equal width
        44,   // Return (คืน) - equal width
        44,   // Pending (ค้าง) - equal width
        68,   // Status (สถานะ) - medium for status text
        57    // Match (ตรงกัน) - medium for match result
      ];
      
      // Verify total width matches pageWidth (should be ~525pt)
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
      if (Math.abs(totalWidth - pageWidth) > 10) {
        // Adjust if significantly off
        const diff = pageWidth - totalWidth;
        // Add difference to the widest column (Name)
        colWidths[2] += diff;
      }
      const headers = ['ลำดับ', 'รหัส', 'รายการ', 'เบิก', 'ใช้', 'คืน', 'ค้าง', 'สถานะ', 'ตรงกัน'];

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
      let matchCount = 0;
      let notMatchCount = 0;

      data.items.forEach((item, index) => {
        // Check if we need a new page
        if (yPos > doc.page.height - 120) {
          doc.addPage({ layout: 'portrait', margin: 35 });
          
          // Redraw header on new page
          doc.fontSize(9).font(finalFontBoldName);
          let xPosHeader = 35;
          headers.forEach((header, i) => {
            doc.rect(xPosHeader, 35, colWidths[i], itemHeight)
               .fillAndStroke('#34495E', '#2C3E50');
            doc.fillColor('#FFFFFF')
               .text(header, xPosHeader + 3, 43, { width: colWidths[i] - 6, align: 'center' });
            xPosHeader += colWidths[i];
          });
          doc.fillColor('#000000');
          yPos = 35 + itemHeight;
        }

        const qtyPending = item.qty_pending ?? (item.qty - item.qty_used_with_patient - item.qty_returned_to_cabinet);
        const isMatch = qtyPending === 0;
        
        if (isMatch) matchCount++;
        else notMatchCount++;

        const rowData = [
          (index + 1).toString(),
          item.order_item_code || item.supply_code || '-',
          item.order_item_description || item.supply_name || '-',
          item.qty.toString(),
          item.qty_used_with_patient.toString(),
          item.qty_returned_to_cabinet.toString(),
          qtyPending.toString(),
          item.item_status,
          isMatch ? 'Match' : 'Not Match',
        ];

        // Alternate row background with elegant contrast
        const isEvenRow = index % 2 === 0;
        if (isEvenRow) {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#F8F9FA');
        } else {
          doc.rect(35, yPos, pageWidth, itemHeight).fill('#FFFFFF');
        }
        
        const cellPadding = 3;
        doc.fontSize(8.5).font(finalFontName);
        xPos = 35;
        rowData.forEach((dataText, i) => {
          // Set background color for match column
          if (i === 8) {
            if (isMatch) {
              doc.rect(xPos, yPos, colWidths[i], itemHeight).fillAndStroke('#D4EDDA', '#C3E6CB');
              doc.fillColor('#155724');
            } else {
              doc.rect(xPos, yPos, colWidths[i], itemHeight).fillAndStroke('#F8D7DA', '#F5C6CB');
              doc.fillColor('#721C24');
            }
          } else {
            doc.rect(xPos, yPos, colWidths[i], itemHeight).stroke('#E0E0E0');
            doc.fillColor('#333333');
          }
          
          doc.text(dataText, xPos + cellPadding, yPos + 6, { 
            width: colWidths[i] - cellPadding * 2, 
            align: i === 0 || i >= 3 ? 'center' : 'left',
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
      const summaryBoxHeight = 82;
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
         .text('สรุปผลการตรวจสอบ', 35 + summaryBoxPadding, summaryBoxY + 5);
      
      // Summary content in 3 rows - consistent spacing
      const summaryStartY = summaryBoxY + summaryHeaderHeight + 8;
      const summaryLineHeight = 15;
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
      
      doc.fontSize(10)
         .font(finalFontBoldName)
         .fillColor('#27AE60')
         .text('ตรงกัน:', summaryLeftX, summaryStartY + summaryLineHeight);
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#27AE60')
         .text(`${matchCount} รายการ`, summaryLeftX + summaryLabelWidth, summaryStartY + summaryLineHeight);
      
      doc.fontSize(10)
         .font(finalFontBoldName)
         .fillColor('#E74C3C')
         .text('ไม่ตรงกัน:', summaryLeftX, summaryStartY + summaryLineHeight * 2);
      doc.fontSize(10)
         .font(finalFontName)
         .fillColor('#E74C3C')
         .text(`${notMatchCount} รายการ`, summaryLeftX + summaryLabelWidth, summaryStartY + summaryLineHeight * 2);

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
