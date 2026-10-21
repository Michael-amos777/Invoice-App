import { formatCurrency } from './calculations.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..'); // server directory

function resolveLogoDataUri(logoUrl) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:')) return logoUrl;

  let diskPath = null;
  if (logoUrl.startsWith('/uploads/') || logoUrl.startsWith('uploads/')) {
    diskPath = path.resolve(serverRoot, logoUrl.replace(/^\//, ''));
  } else if (path.isAbsolute(logoUrl)) {
    diskPath = logoUrl;
  }

  if (diskPath && fs.existsSync(diskPath)) {
    try {
      const ext = path.extname(diskPath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' 
        : ext === '.png' ? 'image/png' 
        : ext === '.webp' ? 'image/webp' 
        : 'image/jpeg';
      const base64 = fs.readFileSync(diskPath).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.error('Error resolving logo for PDF embedding:', e);
    }
  }

  return logoUrl;
}

export function renderInvoiceHtml(invoice, options = {}) {
  const {
    pageSize = 'A4', // 'A4' or 'Letter'
    isForPdf = false
  } = options;

  const template = invoice.template || 'fauget';
  const biz = invoice.business_snapshot 
    ? (typeof invoice.business_snapshot === 'string' ? JSON.parse(invoice.business_snapshot) : invoice.business_snapshot)
    : {};
  const client = invoice.client_snapshot
    ? (typeof invoice.client_snapshot === 'string' ? JSON.parse(invoice.client_snapshot) : invoice.client_snapshot)
    : {};
  const items = invoice.items || [];

  // Always embed logo as base64 Data URI so it renders offline & in PDF generation without network dependency
  if (biz.logo_url) {
    biz.logo_url = resolveLogoDataUri(biz.logo_url);
  }

  const primaryColor = biz.primary_color || '#0E6973';
  const secondaryColor = biz.secondary_color || '#208B99';
  const currency = invoice.currency || biz.default_currency || 'USD';
  const font = biz.preferred_font || 'Plus Jakarta Sans';

  const social = biz.social_links 
    ? (typeof biz.social_links === 'string' ? JSON.parse(biz.social_links) : biz.social_links)
    : {};

  if (template === 'studio') {
    return renderStudioTemplate({
      invoice,
      biz,
      client,
      items,
      social,
      primaryColor: biz.primary_color || '#00FF41',
      currency,
      font,
      pageSize,
      isForPdf
    });
  }

  return renderFaugetTemplate({
    invoice,
    biz,
    client,
    items,
    social,
    primaryColor,
    secondaryColor,
    currency,
    font,
    pageSize,
    isForPdf
  });
}

function renderFaugetTemplate({ invoice, biz, client, items, social, primaryColor, secondaryColor, currency, font, pageSize, isForPdf }) {
  const pageDimensions = pageSize === 'Letter' 
    ? { width: '8.5in', height: '11in' } 
    : { width: '210mm', height: '297mm' };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize === 'Letter' ? 'letter' : 'A4'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: '${font}', 'Plus Jakarta Sans', sans-serif;
      background-color: #F5F2EB;
      color: #122023;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      padding: 0;
    }
    .invoice-wrapper {
      position: relative;
      width: 100%;
      min-height: ${isForPdf ? pageDimensions.height : 'auto'};
      max-width: 820px;
      margin: 0 auto;
      background-color: #F5F2EB;
      overflow: hidden;
      padding: 44px 48px 40px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Abstract decorative arc on top right */
    .gradient-arc {
      position: absolute;
      top: -140px;
      right: -140px;
      width: 440px;
      height: 440px;
      border-radius: 50%;
      background: radial-gradient(circle, ${primaryColor}40 0%, ${secondaryColor}20 50%, transparent 70%);
      pointer-events: none;
      z-index: 1;
    }
    .gradient-arc-inner {
      position: absolute;
      top: 30px;
      right: -60px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      border: 36px solid ${primaryColor}25;
      pointer-events: none;
      z-index: 1;
    }
    .content-layer {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo {
      max-width: 68px;
      max-height: 68px;
      object-fit: contain;
      border-radius: 8px;
    }
    .brand-logo-fallback {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 22px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0c1a1e;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .brand-name-subtle {
      font-size: 15px;
      font-weight: 700;
      color: #1a2c31;
      line-height: 1.2;
    }
    .brand-tagline {
      font-size: 12px;
      color: #556970;
      font-weight: 500;
      margin-top: 2px;
    }
    .invoice-title-section {
      text-align: right;
    }
    .invoice-title {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #0c1a1e;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .meta-line {
      font-size: 13.5px;
      color: #3b4e54;
      line-height: 1.5;
    }
    .meta-line strong {
      color: #112328;
      font-weight: 600;
    }
    /* Parties & Banking */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 30px;
    }
    .section-label {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0c1a1e;
      margin-bottom: 8px;
    }
    .party-details {
      font-size: 13.5px;
      line-height: 1.55;
      color: #334449;
    }
    .party-details .name {
      font-weight: 700;
      color: #0c1a1e;
      font-size: 14.5px;
    }
    /* Table */
    .table-container {
      margin-bottom: 24px;
      border-radius: 18px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    }
    .table-header {
      background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
      color: #FFFFFF;
      display: grid;
      grid-template-columns: 3.2fr 1fr 1.2fr 1.6fr;
      padding: 13px 22px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .table-header .col-num {
      text-align: right;
    }
    .table-body {
      background: #FFFFFF;
      padding: 6px 0;
    }
    .table-row {
      display: grid;
      grid-template-columns: 3.2fr 1fr 1.2fr 1.6fr;
      padding: 13px 22px;
      font-size: 13.5px;
      color: #27373c;
      border-bottom: 1px solid #f1f3f4;
      align-items: center;
    }
    .table-row:last-child {
      border-bottom: none;
    }
    .table-row .col-num {
      text-align: right;
    }
    .item-desc {
      font-weight: 600;
      color: #112226;
    }
    .item-subtext {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 400;
    }
    /* Summary & Notes Section */
    .bottom-section {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 28px;
      align-items: start;
      margin-bottom: 30px;
    }
    .notes-box {
      padding: 10px 4px;
    }
    .notes-label {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #0c1a1e;
      margin-bottom: 8px;
    }
    .notes-text {
      font-size: 12px;
      line-height: 1.6;
      color: #475a61;
    }
    .totals-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 18px 22px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: #3b4e54;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 6px 0;
    }
    .totals-row.grand-total {
      margin-top: 8px;
      padding-top: 10px;
      border-top: 1.5px solid #eaeef0;
      font-size: 15px;
      font-weight: 900;
      color: #0c1a1e;
      letter-spacing: 1px;
    }
    .totals-row.balance-due {
      margin-top: 4px;
      padding-top: 6px;
      font-size: 14px;
      font-weight: 800;
      color: ${primaryColor};
    }
    /* Footer Pill Bar */
    .footer-pill {
      background: #072832;
      border-radius: 9999px;
      padding: 14px 26px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 6px 20px rgba(7, 40, 50, 0.15);
      margin-top: auto;
    }
    .footer-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-icon {
      width: 14px;
      height: 14px;
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="gradient-arc"></div>
    <div class="gradient-arc-inner"></div>

    <div class="content-layer">
      <!-- Top Header -->
      <div class="header">
        <div class="brand-section">
          ${biz.logo_url 
            ? `<img src="${biz.logo_url}" alt="${escapeHtml(biz.business_name || 'Logo')}" class="brand-logo">` 
            : `<div class="brand-logo-fallback">${escapeHtml((biz.business_name || 'I').substring(0, 2).toUpperCase())}</div>`
          }
          <div>
            ${(!biz.logo_url || (biz.show_name_with_logo !== false && biz.show_name_with_logo !== 0))
              ? `<div class="${biz.logo_url ? 'brand-name-subtle' : 'brand-name'}">${escapeHtml(biz.business_name || 'Your Business')}</div>`
              : ''}
            ${biz.owner_name ? `<div class="brand-tagline">${escapeHtml(biz.owner_name)}</div>` : ''}
          </div>
        </div>

        <div class="invoice-title-section">
          <div class="invoice-title">INVOICE</div>
          <div class="meta-line"><strong>Number:</strong> ${escapeHtml(invoice.invoice_number)}</div>
          <div class="meta-line"><strong>Date:</strong> ${escapeHtml(formatDisplayDate(invoice.invoice_date))}</div>
          ${invoice.due_date ? `<div class="meta-line"><strong>Due:</strong> ${escapeHtml(formatDisplayDate(invoice.due_date))}</div>` : ''}
          ${invoice.purchase_order ? `<div class="meta-line"><strong>PO:</strong> ${escapeHtml(invoice.purchase_order)}</div>` : ''}
        </div>
      </div>

      <!-- Parties and Banking -->
      <div class="parties-grid">
        <div>
          <div class="section-label">PAYABLE TO</div>
          <div class="party-details">
            <div class="name">${escapeHtml(client.name || 'Client Name')}</div>
            ${client.company_name ? `<div>${escapeHtml(client.company_name)}</div>` : ''}
            ${client.billing_address ? `<div>${escapeHtml(client.billing_address)}</div>` : ''}
            ${client.phone ? `<div>${escapeHtml(client.phone)}</div>` : ''}
            ${client.email ? `<div>${escapeHtml(client.email)}</div>` : ''}
          </div>
        </div>

        <div>
          <div class="section-label">BANK DETAILS</div>
          <div class="party-details">
            ${biz.bank_name ? `<div><strong>${escapeHtml(biz.bank_name)}</strong></div>` : ''}
            ${biz.bank_account_name ? `<div>${escapeHtml(biz.bank_account_name)}</div>` : ''}
            ${biz.bank_account_number ? `<div style="font-family: monospace; font-size: 13.5px; color: #1a2c31; font-weight: 500;">${escapeHtml(biz.bank_account_number)}</div>` : ''}
            ${biz.bank_address ? `<div style="font-size: 12px; color: #556970; white-space: pre-line; margin-top: 2px;">${escapeHtml(biz.bank_address)}</div>` : ''}
            ${biz.bank_routing_number ? `<div style="font-size: 12px; color: #475a61;">Routing: ${escapeHtml(biz.bank_routing_number)}</div>` : ''}
            ${biz.bank_swift_bic ? `<div style="font-size: 12px; color: #475a61;">SWIFT: ${escapeHtml(biz.bank_swift_bic)}</div>` : ''}
            ${biz.bank_iban ? `<div style="font-size: 12px; color: #475a61;">IBAN: ${escapeHtml(biz.bank_iban)}</div>` : ''}
            ${biz.other_payment_methods ? `<div style="margin-top: 4px; font-size: 11.5px; color: #556970; white-space: pre-line;">${escapeHtml(biz.other_payment_methods)}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Line Items Table -->
      <div class="table-container">
        <div class="table-header">
          <div>ITEM DESCRIPTION</div>
          <div style="text-align: center;">QTY / TIME</div>
          <div style="text-align: right; padding-right: 28px;">PRICE</div>
          <div style="text-align: right;">TOTAL</div>
        </div>
        <div class="table-body">
          ${items.map(item => {
            const qtyStr = item.item_type === 'hourly'
              ? `${item.hours || 0}h ${item.minutes ? item.minutes + 'm' : ''}`
              : (item.quantity !== undefined ? item.quantity : 1);
            
            const rateStr = formatCurrency(item.rate, currency) + (item.item_type === 'hourly' ? '/hr' : '');
            const totalStr = formatCurrency(item.total, currency);

            return `
              <div class="table-row">
                <div>
                  <div class="item-desc">${escapeHtml(item.description)}</div>
                  ${item.project ? `<div class="item-subtext">Project: ${escapeHtml(item.project)}</div>` : ''}
                </div>
                <div style="text-align: center;">${qtyStr}</div>
                <div style="text-align: right; padding-right: 28px;">${rateStr}</div>
                <div style="text-align: right; font-weight: 700; color: #0c1a1e;">${totalStr}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Bottom Notes & Totals -->
      <div class="bottom-section">
        <div class="notes-box">
          <div class="notes-label">NOTES:</div>
          <div class="notes-text">
            ${escapeHtml(invoice.notes || biz.default_notes || 'We appreciate your business. Please reach out if you have any questions regarding this invoice.')}
          </div>
          ${invoice.terms ? `
            <div class="notes-label" style="margin-top: 14px;">TERMS:</div>
            <div class="notes-text">${escapeHtml(invoice.terms)}</div>
          ` : ''}
        </div>

        <div class="totals-card">
          <div class="totals-row">
            <div>SUB TOTAL</div>
            <div>${formatCurrency(invoice.subtotal, currency)}</div>
          </div>

          ${invoice.discount_amount > 0 ? `
            <div class="totals-row" style="color: #059669;">
              <div>DISCOUNT ${invoice.discount_type === 'percentage' ? `(${invoice.discount_value}%)` : ''}</div>
              <div>-${formatCurrency(invoice.discount_amount, currency)}</div>
            </div>
          ` : ''}

          ${invoice.tax_amount > 0 ? `
            <div class="totals-row">
              <div>${escapeHtml(invoice.tax_name || 'TAX')} (${invoice.tax_rate}%)</div>
              <div>${formatCurrency(invoice.tax_amount, currency)}</div>
            </div>
          ` : ''}

          <div class="totals-row grand-total">
            <div>GRAND TOTAL</div>
            <div>${formatCurrency(invoice.total_due, currency)}</div>
          </div>

          ${invoice.amount_paid > 0 ? `
            <div class="totals-row" style="font-size: 12px; color: #059669; padding-top: 6px;">
              <div>AMOUNT PAID</div>
              <div>${formatCurrency(invoice.amount_paid, currency)}</div>
            </div>
            <div class="totals-row balance-due">
              <div>BALANCE DUE</div>
              <div>${formatCurrency(invoice.balance_due, currency)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Footer Pill Bar -->
      <div class="footer-pill">
        ${biz.website ? `
          <div class="footer-item">
            <svg class="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle><path stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span>${escapeHtml(biz.website.replace(/^https?:\/\//, ''))}</span>
          </div>
        ` : ''}

        ${biz.phone ? `
          <div class="footer-item">
            <svg class="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            <span>${escapeHtml(biz.phone)}</span>
          </div>
        ` : ''}

        ${biz.email ? `
          <div class="footer-item">
            <svg class="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            <span>${escapeHtml(biz.email)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderStudioTemplate({ invoice, biz, client, items, social, primaryColor, currency, font, pageSize, isForPdf }) {
  const pageDimensions = pageSize === 'Letter' 
    ? { width: '8.5in', height: '11in' } 
    : { width: '210mm', height: '297mm' };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize === 'Letter' ? 'letter' : 'A4'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: '${font}', 'Space Grotesk', 'Inter', sans-serif;
      background-color: #000000;
      color: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      padding: 0;
    }
    .invoice-wrapper {
      position: relative;
      width: 100%;
      min-height: ${isForPdf ? pageDimensions.height : 'auto'};
      max-width: 820px;
      margin: 0 auto;
      background-color: #000000;
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Top Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 48px;
    }
    .invoice-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .invoice-title {
      font-size: 38px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }
    .invoice-badge {
      background-color: ${primaryColor};
      color: #000000;
      font-size: 20px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .date-meta {
      text-align: right;
      font-size: 13.5px;
      color: #D4D4D8;
      line-height: 1.5;
    }
    /* Parties */
    .middle-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 44px;
    }
    .billed-to {
      font-size: 14px;
      color: #E4E4E7;
      line-height: 1.6;
    }
    .billed-label {
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .studio-brand {
      display: flex;
      align-items: center;
      gap: 16px;
      text-align: right;
    }
    .studio-brand-logo {
      max-width: 60px;
      max-height: 60px;
      object-fit: contain;
    }
    .studio-name {
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.05;
      letter-spacing: -0.5px;
    }
    .studio-name-subtle {
      font-size: 16px;
      font-weight: 700;
      color: #E4E4E7;
      line-height: 1.2;
    }
    /* Table */
    .table-container {
      margin-bottom: 36px;
      border-radius: 4px;
      overflow: hidden;
    }
    .table-header {
      background-color: ${primaryColor};
      color: #000000;
      display: grid;
      grid-template-columns: 3.5fr 1.2fr 1fr 1.3fr;
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .table-header .col-num {
      text-align: right;
    }
    .table-row {
      display: grid;
      grid-template-columns: 3.5fr 1.2fr 1fr 1.3fr;
      padding: 14px 18px;
      font-size: 14px;
      color: #FFFFFF;
      border-bottom: 1px solid #1E1E24;
      align-items: center;
    }
    .table-row .col-num {
      text-align: right;
    }
    .item-desc {
      font-weight: 600;
    }
    .item-subtext {
      font-size: 12px;
      color: #A1A1AA;
      margin-top: 2px;
    }
    /* Totals */
    .summary-section {
      margin-top: auto;
    }
    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      margin-bottom: 18px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      width: 280px;
      font-size: 14px;
      font-weight: 600;
      color: #E4E4E7;
    }
    .total-banner {
      background-color: ${primaryColor};
      color: #000000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 22px;
      border-radius: 4px;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .banking-info {
      margin-top: 24px;
      font-size: 12px;
      color: #71717A;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div>
      <div class="top-bar">
        <div class="invoice-title-group">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-badge">${escapeHtml(invoice.invoice_number)}</div>
        </div>
        <div class="date-meta">
          <div>Issued: ${escapeHtml(formatDisplayDate(invoice.invoice_date))}</div>
          ${invoice.due_date ? `<div>Due: ${escapeHtml(formatDisplayDate(invoice.due_date))}</div>` : ''}
        </div>
      </div>

      <div class="middle-section">
        <div class="billed-to">
          <div class="billed-label">Billed To:</div>
          <div>${escapeHtml(client.name || 'Client Name')}</div>
          ${client.company_name ? `<div>${escapeHtml(client.company_name)}</div>` : ''}
          ${client.billing_address ? `<div>${escapeHtml(client.billing_address)}</div>` : ''}
          ${client.phone ? `<div>${escapeHtml(client.phone)}</div>` : ''}
          ${client.email ? `<div>${escapeHtml(client.email)}</div>` : ''}
        </div>

        <div class="studio-brand">
          ${biz.logo_url ? `<img src="${biz.logo_url}" alt="Logo" class="studio-brand-logo">` : ''}
          ${(!biz.logo_url || (biz.show_name_with_logo !== false && biz.show_name_with_logo !== 0))
            ? `<div class="${biz.logo_url ? 'studio-name-subtle' : 'studio-name'}">${escapeHtml(biz.business_name || 'Flux Studio')}</div>`
            : ''}
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <div>Description</div>
          <div class="col-num">Price</div>
          <div class="col-num">Qty</div>
          <div class="col-num">Subtotal</div>
        </div>
        <div>
          ${items.map(item => {
            const qtyStr = item.item_type === 'hourly'
              ? `${item.hours || 0}h ${item.minutes ? item.minutes + 'm' : ''}`
              : (item.quantity !== undefined ? item.quantity : 1);
            const rateStr = formatCurrency(item.rate, currency);
            const totalStr = formatCurrency(item.total, currency);

            return `
              <div class="table-row">
                <div>
                  <div class="item-desc">${escapeHtml(item.description)}</div>
                  ${item.project ? `<div class="item-subtext">${escapeHtml(item.project)}</div>` : ''}
                </div>
                <div class="col-num">${rateStr}</div>
                <div class="col-num">${qtyStr}</div>
                <div class="col-num">${totalStr}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-lines">
        <div class="summary-row">
          <div>Subtotal:</div>
          <div>${formatCurrency(invoice.subtotal, currency)}</div>
        </div>
        ${invoice.tax_amount > 0 ? `
          <div class="summary-row">
            <div>${escapeHtml(invoice.tax_name || 'Tax')} (${invoice.tax_rate}%):</div>
            <div>${formatCurrency(invoice.tax_amount, currency)}</div>
          </div>
        ` : ''}
        ${invoice.discount_amount > 0 ? `
          <div class="summary-row">
            <div>Discount:</div>
            <div>-${formatCurrency(invoice.discount_amount, currency)}</div>
          </div>
        ` : ''}
      </div>

      <div class="total-banner">
        <div>Total</div>
        <div>${formatCurrency(invoice.total_due, currency)}</div>
      </div>

      ${biz.bank_name || biz.bank_account_number ? `
        <div class="banking-info">
          Payable to: ${escapeHtml(biz.bank_account_name || biz.business_name || '')} | 
          Bank: ${escapeHtml(biz.bank_name || '')} | 
          Account: ${escapeHtml(biz.bank_account_number || '')}
          ${biz.bank_address ? ` | Bank Address: ${escapeHtml(biz.bank_address)}` : ''}
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD to DD/MM/YYYY
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}
