import { query, initDb } from './src/db.js';
import { renderInvoiceHtml } from './src/utils/templateRenderer.js';
import { generatePdfFromHtml } from './src/utils/pdfGenerator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  await initDb();

  // Create Client 1: Mr. Howard Ong (Matching Ref 1)
  const client1Id = 'client-howard-ong';
  await query.run(`DELETE FROM clients WHERE id = ?`, [client1Id]);
  await query.run(`
    INSERT INTO clients (id, name, company_name, email, billing_address, phone, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [client1Id, 'Mr. Howard Ong', 'Ong Ski Tours', 'howard@anycity.com', '123 Anywhere St., Any City', '+1 555-019-2831', 'VIP Winter Sports Client']);

  // Create Client 2: Madison Carter (Matching Ref 2)
  const client2Id = 'client-madison-carter';
  await query.run(`DELETE FROM clients WHERE id = ?`, [client2Id]);
  await query.run(`
    INSERT INTO clients (id, name, company_name, email, billing_address, phone, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [client2Id, 'Madison Carter', 'Carter & Co. Marketing', 'madison@cartermarketing.io', '875 Westbrook Drive, Austin, TX 78702', '+1 512-555-0144', 'Quarterly Brand Strategy Client']);

  // Invoice 1: Ref 1 (Fauget Executive Elegance)
  const inv1Id = 'inv-fauget-01234';
  await query.run(`DELETE FROM invoice_items WHERE invoice_id = ?`, [inv1Id]);
  await query.run(`DELETE FROM invoices WHERE id = ?`, [inv1Id]);

  const bizSnapshot1 = {
    business_name: 'FAUGET',
    owner_name: 'Adventures Ski Service',
    email: 'hello@reallygreatsite.com',
    phone: '123-456-7890',
    address: 'Mountain Ridge Plaza, Suite 10, Denver, CO',
    website: 'https://reallygreatsite.com',
    primary_color: '#0E6973',
    secondary_color: '#208B99',
    preferred_font: 'Plus Jakarta Sans',
    default_currency: 'USD',
    bank_name: 'Salford & Co.',
    bank_account_name: 'Fauget Adventures LLC',
    bank_account_number: '0123 4567 8901 2345'
  };

  const clientSnapshot1 = {
    name: 'Mr. Howard Ong',
    company_name: 'Ong Ski Tours',
    billing_address: '123 Anywhere St., Any City',
    email: 'howard@anycity.com',
    phone: '+1 555-019-2831'
  };

  await query.run(`
    INSERT INTO invoices (
      id, invoice_number, invoice_date, due_date, client_id, client_snapshot,
      business_snapshot, project_name, description, currency, purchase_order,
      subtotal, discount_type, discount_value, discount_amount,
      tax_name, tax_rate, tax_amount, total_due, amount_paid, balance_due,
      status, notes, terms, template, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `, [
    inv1Id, '01234', '2023-10-31', '2023-11-14', client1Id, JSON.stringify(clientSnapshot1),
    JSON.stringify(bizSnapshot1), 'Winter Ski Essentials', 'Ski gear rental and service packages', 'USD', 'PO-9921',
    116.00, 'none', 0, 0,
    'TAX', 13.79, 16.00, 132.00, 0, 132.00,
    'sent',
    'We prioritize customer satisfaction. Our team of passionate skiers and snowboarders is dedicated to delivering exceptional service and ensuring your safety and enjoyment on the slopes.',
    'Net 14 Days', 'fauget'
  ]);

  const items1 = [
    { id: 'item1-1', invoice_id: inv1Id, item_type: 'fixed', description: 'Ski Essentials Package', rate: 40.00, quantity: 2, total: 80.00, order_index: 0 },
    { id: 'item1-2', invoice_id: inv1Id, item_type: 'fixed', description: 'Rental pickup', rate: 10.00, quantity: 1, total: 10.00, order_index: 1 },
    { id: 'item1-3', invoice_id: inv1Id, item_type: 'fixed', description: 'Additional Ski Rental', rate: 5.00, quantity: 2, total: 10.00, order_index: 2 },
    { id: 'item1-4', invoice_id: inv1Id, item_type: 'fixed', description: 'Boots Rental', rate: 4.00, quantity: 2, total: 8.00, order_index: 3 },
    { id: 'item1-5', invoice_id: inv1Id, item_type: 'fixed', description: 'Poles Rental', rate: 4.00, quantity: 2, total: 8.00, order_index: 4 }
  ];

  for (const it of items1) {
    await query.run(`
      INSERT INTO invoice_items (id, invoice_id, item_type, description, rate, quantity, total, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [it.id, it.invoice_id, it.item_type, it.description, it.rate, it.quantity, it.total, it.order_index]);
  }

  // Invoice 2: Ref 2 (Flux Studio Modern Studio Dark & Hourly Revisions)
  const inv2Id = 'inv-flux-1382';
  await query.run(`DELETE FROM invoice_items WHERE invoice_id = ?`, [inv2Id]);
  await query.run(`DELETE FROM invoices WHERE id = ?`, [inv2Id]);

  const bizSnapshot2 = {
    business_name: 'Flux Studio',
    owner_name: 'Studio Design Group',
    email: 'hi@fluxstudio.design',
    phone: '+1 415-890-1122',
    address: '404 Innovation Blvd, San Francisco, CA',
    website: 'https://fluxstudio.design',
    primary_color: '#00FF41',
    secondary_color: '#10E548',
    preferred_font: 'Space Grotesk',
    default_currency: 'USD',
    bank_name: 'Silicon Valley Commercial',
    bank_account_name: 'Flux Studio Co.',
    bank_account_number: '8877 6655 4433 2211'
  };

  const clientSnapshot2 = {
    name: 'Madison Carter',
    company_name: 'Carter & Co. Marketing',
    billing_address: '875 Westbrook Drive\nAustin, TX 78702',
    email: 'madison@cartermarketing.io',
    phone: '+1 512-555-0144'
  };

  await query.run(`
    INSERT INTO invoices (
      id, invoice_number, invoice_date, due_date, client_id, client_snapshot,
      business_snapshot, project_name, description, currency, purchase_order,
      subtotal, discount_type, discount_value, discount_amount,
      tax_name, tax_rate, tax_amount, total_due, amount_paid, balance_due,
      status, notes, terms, template, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `, [
    inv2Id, '#1382', '2026-03-01', '2026-03-20', client2Id, JSON.stringify(clientSnapshot2),
    JSON.stringify(bizSnapshot2), 'Brand Identity & Web Rollout', 'Complete visual branding package and design sprints', 'USD', 'PO-FLUX-44',
    4385.00, 'none', 0, 0,
    'Tax', 8.25, 361.76, 4746.76, 0, 4746.76,
    'sent',
    'Thank you for partnering with Flux Studio. We look forward to executing the next phase of your digital brand.',
    'Net 20 Days', 'studio'
  ]);

  const items2 = [
    { id: 'item2-1', invoice_id: inv2Id, item_type: 'fixed', description: 'Brand Identity Design Package', rate: 1800.00, quantity: 1, total: 1800.00, order_index: 0 },
    { id: 'item2-2', invoice_id: inv2Id, item_type: 'fixed', description: 'Logo Variations (3 concepts)', rate: 450.00, quantity: 1, total: 450.00, order_index: 1 },
    { id: 'item2-3', invoice_id: inv2Id, item_type: 'fixed', description: 'Social Media Kit (15 Templates)', rate: 650.00, quantity: 1, total: 650.00, order_index: 2 },
    { id: 'item2-4', invoice_id: inv2Id, item_type: 'fixed', description: 'Website Landing Page Design', rate: 1200.00, quantity: 1, total: 1200.00, order_index: 3 },
    { id: 'item2-5', invoice_id: inv2Id, item_type: 'hourly', description: 'Additional Revisions (Hourly)', rate: 95.00, hours: 3, minutes: 0, total: 285.00, order_index: 4 }
  ];

  for (const it of items2) {
    await query.run(`
      INSERT INTO invoice_items (id, invoice_id, item_type, description, rate, hours, minutes, quantity, total, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [it.id, it.invoice_id, it.item_type, it.description, it.rate, it.hours || 0, it.minutes || 0, it.quantity || 1, it.total, it.order_index]);
  }

  // Export both sample PDFs to disk to verify real generation
  const fullInv1 = await query.get(`SELECT * FROM invoices WHERE id = ?`, [inv1Id]);
  const fullItems1 = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [inv1Id]);
  const html1 = renderInvoiceHtml({ ...fullInv1, items: fullItems1 }, { pageSize: 'A4', isForPdf: true });
  const pdf1 = await generatePdfFromHtml(html1, { pageSize: 'A4' });
  const outPdf1Path = path.resolve(__dirname, 'Sample_Invoice_01234_Fauget.pdf');
  await fs.writeFile(outPdf1Path, pdf1);

  const fullInv2 = await query.get(`SELECT * FROM invoices WHERE id = ?`, [inv2Id]);
  const fullItems2 = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [inv2Id]);
  const html2 = renderInvoiceHtml({ ...fullInv2, items: fullItems2 }, { pageSize: 'A4', isForPdf: true });
  const pdf2 = await generatePdfFromHtml(html2, { pageSize: 'A4' });
  const outPdf2Path = path.resolve(__dirname, 'Sample_Invoice_1382_FluxStudio.pdf');
  await fs.writeFile(outPdf2Path, pdf2);

  console.log(`Seeded Reference 1 Invoice: ${inv1Id} -> Exported PDF (${pdf1.length} bytes) to: ${outPdf1Path}`);
  console.log(`Seeded Reference 2 Invoice: ${inv2Id} -> Exported PDF (${pdf2.length} bytes) to: ${outPdf2Path}`);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
