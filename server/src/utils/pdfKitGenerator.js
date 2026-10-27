import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatCurrency } from './calculations.js';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

/**
 * Generates a clean, professional vector PDF invoice using PDFKit.
 * Pure JavaScript execution — requires zero external browser processes,
 * zero C++ graphics libraries, and works reliably on all cloud containers.
 *
 * @param {Object} invoice - The invoice database record
 * @param {Array} items - List of invoice items
 * @param {Object} options - { pageSize: 'A4' | 'Letter' }
 * @returns {Promise<Buffer>}
 */
export function generatePdfWithPdfKit(invoice, items = [], options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { pageSize = 'A4' } = options;
      const isLetter = pageSize === 'Letter';
      const size = isLetter ? 'LETTER' : 'A4';

      const biz = invoice.business_snapshot
        ? (typeof invoice.business_snapshot === 'string' ? JSON.parse(invoice.business_snapshot) : invoice.business_snapshot)
        : {};
      const client = invoice.client_snapshot
        ? (typeof invoice.client_snapshot === 'string' ? JSON.parse(invoice.client_snapshot) : invoice.client_snapshot)
        : {};

      const primaryColor = biz.primary_color || '#0E6973';
      const secondaryColor = biz.secondary_color || '#208B99';
      const currency = invoice.currency || biz.default_currency || 'USD';

      const doc = new PDFDocument({
        size,
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Invoice ${invoice.invoice_number || 'Document'}`,
          Author: biz.business_name || 'Invoicr Pro',
          Subject: `Invoice for ${client.name || 'Client'}`
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // --- 1. Top Decorative Brand Banner ---
      doc.rect(0, 0, pageWidth, 8).fill(primaryColor);

      // --- 2. Header: Business Info (Left) & Invoice Title / Number (Right) ---
      let y = 35;

      // Check if logo exists on disk
      let logoDrawn = false;
      if (biz.logo_url) {
        let logoPath = null;
        if (biz.logo_url.startsWith('/uploads/') || biz.logo_url.startsWith('uploads/')) {
          logoPath = path.resolve(serverRoot, biz.logo_url.replace(/^\//, ''));
        } else if (path.isAbsolute(biz.logo_url)) {
          logoPath = biz.logo_url;
        }

        if (logoPath && fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, margin, y, { fit: [120, 50] });
            y += 55;
            logoDrawn = true;
          } catch {
            // Ignore logo rendering failure if unsupported format
          }
        }
      }

      const businessName = biz.business_name || 'Invoicr Pro';
      doc
        .font('Helvetica-Bold')
        .fontSize(logoDrawn ? 16 : 22)
        .fillColor('#0f172a')
        .text(businessName, margin, y);

      y += logoDrawn ? 20 : 26;

      if (biz.owner_name) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(biz.owner_name, margin, y);
        y += 13;
      }
      if (biz.business_address) {
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(biz.business_address, margin, y, { width: 230 });
        y += 24;
      }
      if (biz.email || biz.phone) {
        const contactLine = [biz.email, biz.phone].filter(Boolean).join(' • ');
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(contactLine, margin, y);
        y += 14;
      }

      // Invoice Title & Meta (Right Column)
      const rightColX = pageWidth - margin - 200;
      let rightY = 35;

      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor(primaryColor)
        .text('INVOICE', rightColX, rightY, { align: 'right', width: 200 });

      rightY += 34;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1e293b')
        .text(`Invoice #: ${invoice.invoice_number || 'INV-001'}`, rightColX, rightY, { align: 'right', width: 200 });

      rightY += 16;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text(`Issued: ${formatDisplayDate(invoice.invoice_date)}`, rightColX, rightY, { align: 'right', width: 200 });

      if (invoice.due_date) {
        rightY += 14;
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#64748b')
          .text(`Due: ${formatDisplayDate(invoice.due_date)}`, rightColX, rightY, { align: 'right', width: 200 });
      }

      if (invoice.purchase_order) {
        rightY += 14;
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#64748b')
          .text(`PO Number: ${invoice.purchase_order}`, rightColX, rightY, { align: 'right', width: 200 });
      }

      // --- 3. Billed To Card ---
      y = Math.max(y + 15, rightY + 25);

      const billToBoxY = y;
      doc.roundedRect(margin, billToBoxY, contentWidth, 68, 6).fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(primaryColor)
        .text('BILLED TO', margin + 14, billToBoxY + 10);

      const clientName = client.name || 'Client Name';
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#0f172a')
        .text(clientName, margin + 14, billToBoxY + 22);

      let clientSub = [];
      if (client.company_name) clientSub.push(client.company_name);
      if (client.email) clientSub.push(client.email);
      if (client.phone) clientSub.push(client.phone);
      if (client.billing_address) clientSub.push(client.billing_address);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#475569')
        .text(clientSub.slice(0, 2).join(' • '), margin + 14, billToBoxY + 38);

      if (client.billing_address) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#64748b')
          .text(client.billing_address, margin + 14, billToBoxY + 50, { width: contentWidth - 28 });
      }

      y = billToBoxY + 82;

      // --- 4. Line Items Table Header ---
      doc.rect(margin, y, contentWidth, 24).fill(primaryColor);

      const colDesc = margin + 12;
      const colPrice = margin + contentWidth - 190;
      const colQty = margin + contentWidth - 110;
      const colSubtotal = margin + contentWidth - 12;

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#ffffff')
        .text('DESCRIPTION', colDesc, y + 7)
        .text('PRICE', colPrice, y + 7, { width: 70, align: 'right' })
        .text('QTY / TIME', colQty, y + 7, { width: 60, align: 'center' })
        .text('TOTAL', colSubtotal - 60, y + 7, { width: 60, align: 'right' });

      y += 24;

      // --- 5. Line Items Rows ---
      const activeItems = items.length > 0 ? items : (invoice.items || []);
      activeItems.forEach((item, index) => {
        const isEven = index % 2 === 0;
        const rowHeight = 26;

        if (isEven) {
          doc.rect(margin, y, contentWidth, rowHeight).fill('#fafafa');
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#1e293b')
          .text(item.description || 'Service item', colDesc, y + 8, { width: colPrice - colDesc - 10, lineBreak: false });

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#475569')
          .text(formatCurrency(item.unit_price, currency), colPrice, y + 8, { width: 70, align: 'right' });

        const qtyLabel = item.rate_type === 'hourly'
          ? `${item.hours || 0}h ${item.minutes ? `${item.minutes}m` : ''}`.trim()
          : `${item.quantity || 1}`;

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#475569')
          .text(qtyLabel, colQty, y + 8, { width: 60, align: 'center' });

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#0f172a')
          .text(formatCurrency(item.subtotal || 0, currency), colSubtotal - 60, y + 8, { width: 60, align: 'right' });

        // Row border
        doc.rect(margin, y + rowHeight - 0.5, contentWidth, 0.5).fill('#e2e8f0');

        y += rowHeight;
      });

      y += 10;

      // --- 6. Summary Totals (Right Aligned) ---
      const summaryWidth = 220;
      const summaryX = margin + contentWidth - summaryWidth;

      const drawSummaryRow = (label, value, isBold = false, isAccent = false, bg = null) => {
        if (bg) {
          doc.roundedRect(summaryX, y - 2, summaryWidth, 22, 4).fill(bg);
        }
        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 10 : 8.5)
          .fillColor(isAccent ? primaryColor : '#475569')
          .text(label, summaryX + 8, y + 4, { width: 100 });

        doc
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isBold ? 11 : 8.5)
          .fillColor(isAccent ? primaryColor : '#0f172a')
          .text(value, summaryX + 110, y + 4, { width: 102, align: 'right' });

        y += 20;
      };

      drawSummaryRow('Subtotal:', formatCurrency(invoice.subtotal || 0, currency));

      if (invoice.discount_value > 0) {
        const discountLabel = invoice.discount_type === 'percentage'
          ? `Discount (${invoice.discount_value}%):`
          : 'Discount:';
        drawSummaryRow(discountLabel, `-${formatCurrency(invoice.discount_amount || 0, currency)}`);
      }

      if (invoice.tax_rate > 0) {
        drawSummaryRow(`Tax (${invoice.tax_rate}%):`, `+${formatCurrency(invoice.tax_amount || 0, currency)}`);
      }

      drawSummaryRow('Total Due:', formatCurrency(invoice.total_due || 0, currency), true, true, '#f1f5f9');

      if (invoice.amount_paid > 0) {
        drawSummaryRow('Amount Paid:', formatCurrency(invoice.amount_paid, currency));
        drawSummaryRow('Balance Due:', formatCurrency(invoice.balance_due || 0, currency), true, false, '#fef2f2');
      }

      // --- 7. Payment Details & Notes (Left Column) ---
      let leftY = y - 90;
      if (leftY < billToBoxY + 120) leftY = billToBoxY + 120;

      const bank = biz.bank_details
        ? (typeof biz.bank_details === 'string' ? JSON.parse(biz.bank_details) : biz.bank_details)
        : {};

      if (bank.bank_name || bank.account_number || bank.iban) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(primaryColor)
          .text('PAYMENT DETAILS / BANK TRANSFER', margin, leftY);

        leftY += 13;

        let bankInfo = [];
        if (bank.bank_name) bankInfo.push(`Bank: ${bank.bank_name}`);
        if (bank.account_name) bankInfo.push(`Account Name: ${bank.account_name}`);
        if (bank.account_number) bankInfo.push(`Account #: ${bank.account_number}`);
        if (bank.sort_code) bankInfo.push(`Sort Code: ${bank.sort_code}`);
        if (bank.iban) bankInfo.push(`IBAN: ${bank.iban}`);
        if (bank.swift) bankInfo.push(`SWIFT/BIC: ${bank.swift}`);

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#475569')
          .text(bankInfo.join('\n'), margin, leftY, { width: 260, lineGap: 2 });
      }

      // --- 8. Notes & Terms ---
      if (invoice.notes || invoice.terms) {
        y = Math.max(y + 15, leftY + 50);
        if (invoice.notes) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('NOTES', margin, y);
          y += 11;
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(invoice.notes, margin, y, { width: contentWidth });
          y += 18;
        }
        if (invoice.terms) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('TERMS & CONDITIONS', margin, y);
          y += 11;
          doc.font('Helvetica').fontSize(8).fillColor('#334155').text(invoice.terms, margin, y, { width: contentWidth });
        }
      }

      // --- 9. Clean Bottom Footer ---
      const footerY = doc.page.height - 35;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Thank you for your business! Generated with Invoicr Pro', margin, footerY, {
          align: 'center',
          width: contentWidth
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
