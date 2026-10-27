import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePdfWithPdfKit } from '../src/utils/pdfKitGenerator.js';

test('Generates real binary vector PDF using pure-JS PDFKit', async () => {
  const invoice = {
    invoice_number: 'INV-2026-TEST',
    invoice_date: '2026-10-27',
    due_date: '2026-11-10',
    subtotal: 1000,
    total_due: 1100,
    tax_rate: 10,
    tax_amount: 100,
    discount_value: 0,
    discount_amount: 0,
    amount_paid: 0,
    balance_due: 1100,
    currency: 'USD',
    business_snapshot: {
      business_name: 'Antigravity Studio',
      owner_name: 'Michael Amos',
      primary_color: '#0E6973'
    },
    client_snapshot: {
      name: 'Acme Corp',
      email: 'billing@acme.com'
    }
  };

  const items = [
    { description: 'Cloud Infrastructure Setup', unit_price: 500, quantity: 2, subtotal: 1000, rate_type: 'fixed' }
  ];

  const pdfBuffer = await generatePdfWithPdfKit(invoice, items, { pageSize: 'A4' });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  // All valid PDFs begin with %PDF-
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});
