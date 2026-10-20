import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api';

test('API End-to-End: Profile, Client, and Invoice Lifecycle', async () => {
  // 1. Fetch profile
  const profileRes = await fetch(`${BASE_URL}/profile`);
  assert.equal(profileRes.status, 200);
  const profile = await profileRes.json();
  assert.equal(profile.id, 'default');
  assert.ok(profile.business_name);

  // 2. Create a client
  const clientPayload = {
    name: 'Sarah Connor',
    company_name: 'Cyberdyne Systems',
    email: 'sarah@cyberdyne.io',
    billing_address: '100 Industrial Way, Los Angeles, CA 90001',
    phone: '+1 310-555-0199',
    notes: 'Key enterprise account'
  };
  const clientRes = await fetch(`${BASE_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientPayload)
  });
  assert.equal(clientRes.status, 201);
  const client = await clientRes.json();
  assert.ok(client.id);
  assert.equal(client.name, 'Sarah Connor');

  // 3. Create an invoice with mixed fixed and hourly items
  const invoicePayload = {
    client_id: client.id,
    project_name: 'Core System Migration',
    description: 'Cloud infrastructure rollout and custom theme architecture',
    currency: 'USD',
    items: [
      {
        item_type: 'hourly',
        description: 'Infrastructure Architecture & Code Review',
        project: 'Core System Migration',
        rate: 20,
        hours: 6,
        minutes: 28
      },
      {
        item_type: 'fixed',
        description: 'Brand Identity Vector Assets Package',
        project: 'Core System Migration',
        rate: 175.00,
        quantity: 1
      }
    ],
    discount: { type: 'percentage', value: 10 },
    tax: { rate: 10, name: 'VAT' }
  };

  const invoiceRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoicePayload)
  });
  assert.equal(invoiceRes.status, 201);
  const invoice = await invoiceRes.json();
  
  // Total item 1: 20 * (6 + 28/60) = 129.33
  // Total item 2: 175.00
  // Subtotal: 304.33
  // Discount 10%: 30.43
  // Taxable: 273.90
  // Tax 10%: 27.39
  // Total Due: 301.29
  assert.equal(invoice.subtotal, 304.33);
  assert.equal(invoice.discount_amount, 30.43);
  assert.equal(invoice.tax_amount, 27.39);
  assert.equal(invoice.total_due, 301.29);
  assert.equal(invoice.balance_due, 301.29);
  assert.ok(invoice.invoice_number);

  // Verify business snapshot is frozen
  assert.ok(invoice.business_snapshot);
  assert.equal(invoice.business_snapshot.business_name, profile.business_name);

  // 4. Record partial payment
  const paymentRes = await fetch(`${BASE_URL}/invoices/${invoice.id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 100.00,
      payment_method: 'ACH Wire',
      reference_note: 'Initial deposit'
    })
  });
  assert.equal(paymentRes.status, 200);
  const paymentData = await paymentRes.json();
  assert.equal(paymentData.amount_paid, 100.00);
  assert.equal(paymentData.balance_due, 201.29);
  assert.equal(paymentData.status, 'partially_paid');

  // 5. Download generated PDF
  const pdfRes = await fetch(`${BASE_URL}/invoices/${invoice.id}/pdf`);
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  assert.ok(pdfBuffer.length > 1000);
  assert.equal(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-');

  // 6. Test duplicate invoice
  const dupRes = await fetch(`${BASE_URL}/invoices/${invoice.id}/duplicate`, {
    method: 'POST'
  });
  assert.equal(dupRes.status, 201);
  const dupInvoice = await dupRes.json();
  assert.notEqual(dupInvoice.invoice_number, invoice.invoice_number);
  assert.equal(dupInvoice.status, 'draft');
  assert.equal(dupInvoice.amount_paid, 0);

  // 7. Verify dashboard stats include new invoice
  const statsRes = await fetch(`${BASE_URL}/dashboard/stats`);
  assert.equal(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.ok(stats.totalInvoices >= 2);
  assert.ok(stats.totalInvoiced > 0);
});
