import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(DB_PATH);

// Wrap db methods in Promises for clean async/await
export const query = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

export async function initDb() {
  await query.run(`
    CREATE TABLE IF NOT EXISTS business_profiles (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      logo_url TEXT,
      owner_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      social_links TEXT,
      primary_color TEXT DEFAULT '#0E6973',
      secondary_color TEXT DEFAULT '#208B99',
      preferred_font TEXT DEFAULT 'Plus Jakarta Sans',
      default_currency TEXT DEFAULT 'USD',
      default_payment_terms TEXT DEFAULT 'Net 14',
      default_notes TEXT,
      default_tax_rate REAL DEFAULT 0,
      default_tax_name TEXT DEFAULT 'Tax',
      bank_name TEXT,
      bank_account_name TEXT,
      bank_account_number TEXT,
      bank_account_type TEXT,
      bank_routing_number TEXT,
      bank_swift_bic TEXT,
      bank_iban TEXT,
      other_payment_methods TEXT,
      invoice_prefix TEXT DEFAULT 'INV-',
      next_invoice_number INTEGER DEFAULT 1001,
      selected_template TEXT DEFAULT 'fauget',
      show_name_with_logo INTEGER DEFAULT 1,
      updated_at TEXT
    );
  `);

  try {
    await query.run(`ALTER TABLE business_profiles ADD COLUMN show_name_with_logo INTEGER DEFAULT 1`);
  } catch (err) {
    // Column already exists
  }

  await query.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_name TEXT,
      email TEXT,
      billing_address TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      client_id TEXT,
      client_snapshot TEXT,
      business_snapshot TEXT,
      project_name TEXT,
      description TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      purchase_order TEXT,
      subtotal REAL NOT NULL,
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_name TEXT DEFAULT 'Tax',
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_due REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      terms TEXT,
      template TEXT DEFAULT 'fauget',
      created_at TEXT,
      updated_at TEXT
    );
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      project TEXT,
      rate REAL NOT NULL,
      hours REAL DEFAULT 0,
      minutes REAL DEFAULT 0,
      quantity REAL DEFAULT 1,
      total REAL NOT NULL,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT,
      reference_note TEXT,
      created_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  // Initialize a default profile if none exists
  const existingProfile = await query.get(`SELECT id FROM business_profiles WHERE id = 'default'`);
  if (!existingProfile) {
    await query.run(`
      INSERT INTO business_profiles (
        id, business_name, owner_name, email, phone, address, website,
        social_links, primary_color, secondary_color, preferred_font,
        default_currency, default_payment_terms, default_notes,
        default_tax_rate, default_tax_name, bank_name, bank_account_name,
        bank_account_number, bank_account_type, bank_routing_number,
        bank_swift_bic, bank_iban, other_payment_methods,
        invoice_prefix, next_invoice_number, selected_template, updated_at
      ) VALUES (
        'default', '', '', '', '',
        '', '',
        '{}',
        '#0E6973', '#208B99', 'Plus Jakarta Sans',
        'USD', 'Net 14',
        '',
        0, 'Tax', '', '',
        '', 'Checking', '', '', '',
        '',
        'INV-', 1001, 'fauget', datetime('now')
      );
    `);
  }
}

export async function resetDatabase(mode = 'all') {
  if (mode === 'all') {
    // 1. Wipe all payments, items, invoices, and clients
    await query.run(`DELETE FROM payments`);
    await query.run(`DELETE FROM invoice_items`);
    await query.run(`DELETE FROM invoices`);
    await query.run(`DELETE FROM clients`);

    // 2. Wipe business profile to a clean slate (blank figures and names)
    await query.run(`
      UPDATE business_profiles SET
        business_name = '',
        owner_name = '',
        logo_url = NULL,
        email = '',
        phone = '',
        address = '',
        website = '',
        social_links = '{}',
        primary_color = '#0E6973',
        secondary_color = '#208B99',
        preferred_font = 'Plus Jakarta Sans',
        default_currency = 'USD',
        default_payment_terms = 'Net 14',
        default_notes = '',
        default_tax_rate = 0,
        default_tax_name = 'Tax',
        bank_name = '',
        bank_account_name = '',
        bank_account_number = '',
        bank_account_type = 'Checking',
        bank_routing_number = '',
        bank_swift_bic = '',
        bank_iban = '',
        other_payment_methods = '',
        invoice_prefix = 'INV-',
        next_invoice_number = 1001,
        selected_template = 'fauget',
        updated_at = datetime('now')
      WHERE id = 'default'
    `);

    return {
      success: true,
      mode: 'all',
      message: 'Workspace completely reset to clean blank state. All sample figures and names have been wiped.'
    };
  } else if (mode === 'data_only') {
    // Wipe all payments, items, invoices, clients; keep business profile
    await query.run(`DELETE FROM payments`);
    await query.run(`DELETE FROM invoice_items`);
    await query.run(`DELETE FROM invoices`);
    await query.run(`DELETE FROM clients`);

    return {
      success: true,
      mode: 'data_only',
      message: 'All invoices and clients removed. Your business profile was preserved.'
    };
  } else if (mode === 'seed') {
    return await seedDemoData();
  } else {
    throw new Error(`Invalid reset mode: ${mode}`);
  }
}

export async function seedDemoData() {
  // Wipe existing
  await query.run(`DELETE FROM payments`);
  await query.run(`DELETE FROM invoice_items`);
  await query.run(`DELETE FROM invoices`);
  await query.run(`DELETE FROM clients`);

  // Seed sample business profile
  await query.run(`
    UPDATE business_profiles SET
      business_name = 'Acme Creative Studio',
      owner_name = 'Alex Morgan',
      logo_url = NULL,
      email = 'hello@acmecreative.com',
      phone = '+1 (555) 234-5678',
      address = '742 Evergreen Terrace, Suite 400, Springfield, OR 97477',
      website = 'https://acmecreative.com',
      social_links = '{"linkedin":"linkedin.com/company/acmecreative","instagram":"@acmecreative","twitter":"@acmecreative"}',
      primary_color = '#0E6973',
      secondary_color = '#208B99',
      preferred_font = 'Plus Jakarta Sans',
      default_currency = 'USD',
      default_payment_terms = 'Net 14',
      default_notes = 'Payment is appreciated within terms. Please include the invoice number on your wire transfer or check.',
      default_tax_rate = 10.0,
      default_tax_name = 'Tax',
      bank_name = 'First Horizon Commercial Bank',
      bank_account_name = 'Acme Creative Studio LLC',
      bank_account_number = '987654321098',
      bank_account_type = 'Checking',
      bank_routing_number = '122105155',
      bank_swift_bic = 'FTHBUS33',
      bank_iban = 'US89FTHB122105155987654321',
      other_payment_methods = 'Wire transfer, ACH, or check to Acme Creative Studio LLC',
      invoice_prefix = 'INV-',
      next_invoice_number = 1003,
      selected_template = 'fauget',
      updated_at = datetime('now')
    WHERE id = 'default'
  `);

  // Client 1: Mr. Howard Ong
  const client1Id = 'client-howard-ong';
  await query.run(`
    INSERT INTO clients (id, name, company_name, email, billing_address, phone, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [client1Id, 'Mr. Howard Ong', 'Ong Ski Tours', 'howard@anycity.com', '123 Anywhere St., Any City', '+1 555-019-2831', 'VIP Winter Sports Client']);

  // Client 2: Madison Carter
  const client2Id = 'client-madison-carter';
  await query.run(`
    INSERT INTO clients (id, name, company_name, email, billing_address, phone, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [client2Id, 'Madison Carter', 'Carter & Co. Marketing', 'madison@cartermarketing.io', '875 Westbrook Drive, Austin, TX 78702', '+1 512-555-0144', 'Quarterly Brand Strategy Client']);

  // Invoice 1: 01234
  const inv1Id = 'inv-fauget-01234';
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
    inv1Id, '01234', '2026-10-15', '2026-10-29', client1Id, JSON.stringify(clientSnapshot1),
    JSON.stringify(bizSnapshot1), 'Winter Ski Essentials', 'Ski gear rental and service packages', 'USD', 'PO-9921',
    116.00, 'none', 0, 0,
    'TAX', 13.79, 16.00, 132.00, 0, 132.00,
    'sent',
    'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional service.',
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

  // Invoice 2: #1382
  const inv2Id = 'inv-flux-1382';
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
    inv2Id, '#1382', '2026-10-18', '2026-11-05', client2Id, JSON.stringify(clientSnapshot2),
    JSON.stringify(bizSnapshot2), 'Brand Identity & Web Rollout', 'Complete visual branding package and design sprints', 'USD', 'PO-FLUX-44',
    4385.00, 'none', 0, 0,
    'Tax', 8.25, 361.76, 4746.76, 0, 4746.76,
    'sent',
    'Thank you for partnering with Flux Studio.',
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

  return {
    success: true,
    mode: 'seed',
    message: 'Demo data loaded successfully with sample invoices and clients.'
  };
}

export default db;
