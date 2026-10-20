import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db, { initDb, query, resetDatabase, seedDemoData } from './db.js';
import { calculateInvoiceTotals, calculateItemTotal, roundToTwoDecimals } from './utils/calculations.js';
import { renderInvoiceHtml } from './utils/templateRenderer.js';
import { generatePdfFromHtml } from './utils/pdfGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|svg\+xml|svg|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(file.mimetype) || allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, SVG, and WebP images are allowed'));
    }
  }
});

// Initialize DB schema on startup
await initDb();

/* ========================================================
   BUSINESS PROFILE & SETTINGS ENDPOINTS
   ======================================================== */

// Get active business profile
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await query.get(`SELECT * FROM business_profiles WHERE id = 'default'`);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update business profile & settings
app.put('/api/profile', async (req, res) => {
  try {
    const p = req.body;
    await query.run(`
      UPDATE business_profiles SET
        business_name = ?,
        logo_url = ?,
        owner_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        website = ?,
        social_links = ?,
        primary_color = ?,
        secondary_color = ?,
        preferred_font = ?,
        default_currency = ?,
        default_payment_terms = ?,
        default_notes = ?,
        default_tax_rate = ?,
        default_tax_name = ?,
        bank_name = ?,
        bank_account_name = ?,
        bank_account_number = ?,
        bank_account_type = ?,
        bank_routing_number = ?,
        bank_swift_bic = ?,
        bank_iban = ?,
        other_payment_methods = ?,
        invoice_prefix = ?,
        next_invoice_number = ?,
        selected_template = ?,
        updated_at = datetime('now')
      WHERE id = 'default'
    `, [
      p.business_name || 'My Business',
      p.logo_url || null,
      p.owner_name || '',
      p.email || '',
      p.phone || '',
      p.address || '',
      p.website || '',
      typeof p.social_links === 'object' ? JSON.stringify(p.social_links) : (p.social_links || '{}'),
      p.primary_color || '#0E6973',
      p.secondary_color || '#208B99',
      p.preferred_font || 'Plus Jakarta Sans',
      p.default_currency || 'USD',
      p.default_payment_terms || 'Net 14',
      p.default_notes || '',
      Number(p.default_tax_rate) || 0,
      p.default_tax_name || 'Tax',
      p.bank_name || '',
      p.bank_account_name || '',
      p.bank_account_number || '',
      p.bank_account_type || 'Checking',
      p.bank_routing_number || '',
      p.bank_swift_bic || '',
      p.bank_iban || '',
      p.other_payment_methods || '',
      p.invoice_prefix || 'INV-',
      Number(p.next_invoice_number) || 1001,
      p.selected_template || 'fauget'
    ]);

    const updated = await query.get(`SELECT * FROM business_profiles WHERE id = 'default'`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload business logo
app.post('/api/profile/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    await query.run(`UPDATE business_profiles SET logo_url = ?, updated_at = datetime('now') WHERE id = 'default'`, [logoUrl]);
    res.json({ logo_url: logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove business logo
app.delete('/api/profile/logo', async (req, res) => {
  try {
    await query.run(`UPDATE business_profiles SET logo_url = NULL, updated_at = datetime('now') WHERE id = 'default'`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================================================
   CLIENT MANAGEMENT ENDPOINTS
   ======================================================== */

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT c.*, 
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.total_due), 0) as total_billed,
        COALESCE(SUM(i.amount_paid), 0) as total_paid,
        COALESCE(SUM(i.balance_due), 0) as balance_due
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
    `;
    const params = [];

    if (search) {
      sql += ` WHERE c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;
    const clients = await query.all(sql, params);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new client
app.post('/api/clients', async (req, res) => {
  try {
    const { name, company_name, email, billing_address, phone, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    await query.run(`
      INSERT INTO clients (id, name, company_name, email, billing_address, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name.trim(), company_name || '', email || '', billing_address || '', phone || '', notes || '', now, now]);

    const client = await query.get(`SELECT * FROM clients WHERE id = ?`, [id]);
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single client with invoices history
app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await query.get(`SELECT * FROM clients WHERE id = ?`, [req.params.id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const invoices = await query.all(`
      SELECT id, invoice_number, invoice_date, due_date, total_due, amount_paid, balance_due, status
      FROM invoices WHERE client_id = ? ORDER BY invoice_date DESC
    `, [client.id]);

    res.json({ ...client, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { name, company_name, email, billing_address, phone, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const now = new Date().toISOString();
    await query.run(`
      UPDATE clients SET
        name = ?, company_name = ?, email = ?, billing_address = ?, phone = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [name.trim(), company_name || '', email || '', billing_address || '', phone || '', notes || '', now, req.params.id]);

    const updated = await query.get(`SELECT * FROM clients WHERE id = ?`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    await query.run(`DELETE FROM clients WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================================================
   INVOICE GENERATION & MANAGEMENT ENDPOINTS
   ======================================================== */

// List all invoices with search & filters
app.get('/api/invoices', async (req, res) => {
  try {
    const { search, status, client_id, from_date, to_date } = req.query;
    let sql = `SELECT * FROM invoices WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (invoice_number LIKE ? OR project_name LIKE ? OR description LIKE ? OR client_snapshot LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (client_id) {
      sql += ` AND client_id = ?`;
      params.push(client_id);
    }

    if (from_date) {
      sql += ` AND invoice_date >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      sql += ` AND invoice_date <= ?`;
      params.push(to_date);
    }

    sql += ` ORDER BY created_at DESC`;
    const invoices = await query.all(sql, params);

    // Parse JSON snapshots for response
    const parsed = invoices.map(inv => ({
      ...inv,
      client_snapshot: inv.client_snapshot ? JSON.parse(inv.client_snapshot) : null,
      business_snapshot: inv.business_snapshot ? JSON.parse(inv.business_snapshot) : null
    }));

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with line items & payments
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await query.get(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const items = await query.all(`
      SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC
    `, [invoice.id]);

    const payments = await query.all(`
      SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC
    `, [invoice.id]);

    res.json({
      ...invoice,
      client_snapshot: invoice.client_snapshot ? JSON.parse(invoice.client_snapshot) : null,
      business_snapshot: invoice.business_snapshot ? JSON.parse(invoice.business_snapshot) : null,
      items,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      due_date,
      client_id,
      client_data, // if creating on the fly or custom
      project_name,
      description,
      currency,
      purchase_order,
      items = [],
      discount = { type: 'none', value: 0 },
      tax = { rate: 0, name: 'Tax' },
      notes,
      terms,
      template,
      status = 'draft'
    } = req.body;

    // Get current business profile for snapshot
    const profile = await query.get(`SELECT * FROM business_profiles WHERE id = 'default'`);
    if (!profile) {
      return res.status(400).json({ error: 'Business profile must be configured first' });
    }

    // Determine invoice number
    let finalInvoiceNumber = invoice_number;
    if (!finalInvoiceNumber || !finalInvoiceNumber.trim()) {
      const prefix = profile.invoice_prefix || 'INV-';
      const num = profile.next_invoice_number || 1001;
      finalInvoiceNumber = `${prefix}${String(num).padStart(4, '0')}`;
      // Advance next invoice number
      await query.run(`UPDATE business_profiles SET next_invoice_number = ? WHERE id = 'default'`, [num + 1]);
    } else {
      // Check for duplicate invoice number
      const existing = await query.get(`SELECT id FROM invoices WHERE invoice_number = ?`, [finalInvoiceNumber.trim()]);
      if (existing) {
        return res.status(400).json({ error: `Invoice number '${finalInvoiceNumber}' already exists. Please choose a unique number.` });
      }
    }

    // Determine Client Snapshot
    let clientSnapshot = client_data || {};
    let finalClientId = client_id;
    if (client_id) {
      const client = await query.get(`SELECT * FROM clients WHERE id = ?`, [client_id]);
      if (client) {
        clientSnapshot = {
          id: client.id,
          name: client.name,
          company_name: client.company_name,
          email: client.email,
          billing_address: client.billing_address,
          phone: client.phone
        };
      }
    } else if (client_data && client_data.save_client && client_data.name) {
      // Optionally auto-save client into directory
      const newClientId = uuidv4();
      const now = new Date().toISOString();
      await query.run(`
        INSERT INTO clients (id, name, company_name, email, billing_address, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [newClientId, client_data.name, client_data.company_name || '', client_data.email || '', client_data.billing_address || '', client_data.phone || '', now, now]);
      finalClientId = newClientId;
      clientSnapshot.id = newClientId;
    }

    // Calculate totals server-side
    const totals = calculateInvoiceTotals(items, discount, tax, 0);

    const invoiceId = uuidv4();
    const now = new Date().toISOString();

    // Snapshot of business profile at this moment
    const businessSnapshot = {
      business_name: profile.business_name,
      logo_url: profile.logo_url,
      owner_name: profile.owner_name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      website: profile.website,
      social_links: profile.social_links ? (typeof profile.social_links === 'string' ? JSON.parse(profile.social_links) : profile.social_links) : {},
      primary_color: profile.primary_color,
      secondary_color: profile.secondary_color,
      preferred_font: profile.preferred_font,
      default_currency: profile.default_currency,
      bank_name: profile.bank_name,
      bank_account_name: profile.bank_account_name,
      bank_account_number: profile.bank_account_number,
      bank_account_type: profile.bank_account_type,
      bank_routing_number: profile.bank_routing_number,
      bank_swift_bic: profile.bank_swift_bic,
      bank_iban: profile.bank_iban,
      other_payment_methods: profile.other_payment_methods
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
        ?, ?, ?, ?, ?, ?
      )
    `, [
      invoiceId,
      finalInvoiceNumber.trim(),
      invoice_date || new Date().toISOString().split('T')[0],
      due_date || '',
      finalClientId || null,
      JSON.stringify(clientSnapshot),
      JSON.stringify(businessSnapshot),
      project_name || '',
      description || '',
      currency || profile.default_currency || 'USD',
      purchase_order || '',
      totals.subtotal,
      discount.type || 'none',
      Number(discount.value) || 0,
      totals.discountAmount,
      tax.name || profile.default_tax_name || 'Tax',
      Number(tax.rate) || 0,
      totals.taxAmount,
      totals.totalDue,
      0,
      totals.totalDue,
      status || 'draft',
      notes !== undefined ? notes : (profile.default_notes || ''),
      terms || '',
      template || profile.selected_template || 'fauget',
      now,
      now
    ]);

    // Insert line items
    for (let i = 0; i < totals.calculatedItems.length; i++) {
      const item = totals.calculatedItems[i];
      const itemId = uuidv4();
      await query.run(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, description, project, rate, hours, minutes, quantity, total, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId,
        invoiceId,
        item.item_type || 'fixed',
        item.description || 'Service',
        item.project || '',
        Number(item.rate) || 0,
        Number(item.hours) || 0,
        Number(item.minutes) || 0,
        item.quantity !== undefined ? Number(item.quantity) : 1,
        item.total,
        i
      ]);
    }

    const created = await query.get(`SELECT * FROM invoices WHERE id = ?`, [invoiceId]);
    const savedItems = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC`, [invoiceId]);

    res.status(201).json({
      ...created,
      client_snapshot: JSON.parse(created.client_snapshot),
      business_snapshot: JSON.parse(created.business_snapshot),
      items: savedItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const {
      invoice_number,
      invoice_date,
      due_date,
      client_id,
      client_data,
      project_name,
      description,
      currency,
      purchase_order,
      items = [],
      discount = { type: 'none', value: 0 },
      tax = { rate: 0, name: 'Tax' },
      notes,
      terms,
      template,
      status
    } = req.body;

    // Check duplicate invoice number if changed
    if (invoice_number && invoice_number.trim() !== existing.invoice_number) {
      const duplicate = await query.get(`SELECT id FROM invoices WHERE invoice_number = ? AND id != ?`, [invoice_number.trim(), id]);
      if (duplicate) {
        return res.status(400).json({ error: `Invoice number '${invoice_number}' already exists.` });
      }
    }

    // Determine Client Snapshot
    let clientSnapshot = existing.client_snapshot ? JSON.parse(existing.client_snapshot) : {};
    if (client_id && client_id !== existing.client_id) {
      const client = await query.get(`SELECT * FROM clients WHERE id = ?`, [client_id]);
      if (client) {
        clientSnapshot = {
          id: client.id,
          name: client.name,
          company_name: client.company_name,
          email: client.email,
          billing_address: client.billing_address,
          phone: client.phone
        };
      }
    } else if (client_data) {
      clientSnapshot = { ...clientSnapshot, ...client_data };
    }

    const totals = calculateInvoiceTotals(items, discount, tax, existing.amount_paid);
    const now = new Date().toISOString();

    await query.run(`
      UPDATE invoices SET
        invoice_number = ?,
        invoice_date = ?,
        due_date = ?,
        client_id = ?,
        client_snapshot = ?,
        project_name = ?,
        description = ?,
        currency = ?,
        purchase_order = ?,
        subtotal = ?,
        discount_type = ?,
        discount_value = ?,
        discount_amount = ?,
        tax_name = ?,
        tax_rate = ?,
        tax_amount = ?,
        total_due = ?,
        balance_due = ?,
        status = ?,
        notes = ?,
        terms = ?,
        template = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      invoice_number ? invoice_number.trim() : existing.invoice_number,
      invoice_date || existing.invoice_date,
      due_date !== undefined ? due_date : existing.due_date,
      client_id !== undefined ? client_id : existing.client_id,
      JSON.stringify(clientSnapshot),
      project_name !== undefined ? project_name : existing.project_name,
      description !== undefined ? description : existing.description,
      currency || existing.currency,
      purchase_order !== undefined ? purchase_order : existing.purchase_order,
      totals.subtotal,
      discount.type || existing.discount_type,
      Number(discount.value) !== undefined ? Number(discount.value) : existing.discount_value,
      totals.discountAmount,
      tax.name || existing.tax_name,
      Number(tax.rate) !== undefined ? Number(tax.rate) : existing.tax_rate,
      totals.taxAmount,
      totals.totalDue,
      totals.balanceDue,
      status || totals.derivedStatus || existing.status,
      notes !== undefined ? notes : existing.notes,
      terms !== undefined ? terms : existing.terms,
      template || existing.template,
      now,
      id
    ]);

    // Replace items
    await query.run(`DELETE FROM invoice_items WHERE invoice_id = ?`, [id]);
    for (let i = 0; i < totals.calculatedItems.length; i++) {
      const item = totals.calculatedItems[i];
      const itemId = uuidv4();
      await query.run(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, description, project, rate, hours, minutes, quantity, total, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId,
        id,
        item.item_type || 'fixed',
        item.description || 'Service',
        item.project || '',
        Number(item.rate) || 0,
        Number(item.hours) || 0,
        Number(item.minutes) || 0,
        item.quantity !== undefined ? Number(item.quantity) : 1,
        item.total,
        i
      ]);
    }

    const updated = await query.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
    const updatedItems = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC`, [id]);

    res.json({
      ...updated,
      client_snapshot: JSON.parse(updated.client_snapshot),
      business_snapshot: JSON.parse(updated.business_snapshot),
      items: updatedItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate invoice
app.post('/api/invoices/:id/duplicate', async (req, res) => {
  try {
    const existing = await query.get(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const existingItems = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC`, [existing.id]);
    const profile = await query.get(`SELECT * FROM business_profiles WHERE id = 'default'`);

    const prefix = profile.invoice_prefix || 'INV-';
    const num = profile.next_invoice_number || 1001;
    const newInvoiceNumber = `${prefix}${String(num).padStart(4, '0')}`;
    await query.run(`UPDATE business_profiles SET next_invoice_number = ? WHERE id = 'default'`, [num + 1]);

    const newId = uuidv4();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

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
        ?, ?, ?, ?, ?, ?
      )
    `, [
      newId,
      newInvoiceNumber,
      today,
      '',
      existing.client_id,
      existing.client_snapshot,
      existing.business_snapshot,
      existing.project_name ? `${existing.project_name} (Copy)` : '',
      existing.description,
      existing.currency,
      '',
      existing.subtotal,
      existing.discount_type,
      existing.discount_value,
      existing.discount_amount,
      existing.tax_name,
      existing.tax_rate,
      existing.tax_amount,
      existing.total_due,
      0,
      existing.total_due,
      'draft',
      existing.notes,
      existing.terms,
      existing.template,
      now,
      now
    ]);

    for (const item of existingItems) {
      const itemId = uuidv4();
      await query.run(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, description, project, rate, hours, minutes, quantity, total, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId,
        newId,
        item.item_type,
        item.description,
        item.project,
        item.rate,
        item.hours,
        item.minutes,
        item.quantity,
        item.total,
        item.order_index
      ]);
    }

    const duplicated = await query.get(`SELECT * FROM invoices WHERE id = ?`, [newId]);
    res.status(201).json(duplicated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a payment against an invoice
app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, reference_note } = req.body;
    const paymentAmount = roundToTwoDecimals(Number(amount) || 0);

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    const invoice = await query.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentId = uuidv4();
    const now = new Date().toISOString();
    await query.run(`
      INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [paymentId, id, paymentAmount, payment_date || now.split('T')[0], payment_method || 'Bank Transfer', reference_note || '', now]);

    const newAmountPaid = roundToTwoDecimals(invoice.amount_paid + paymentAmount);
    const newBalanceDue = roundToTwoDecimals(Math.max(0, invoice.total_due - newAmountPaid));
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

    await query.run(`
      UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ?, updated_at = ? WHERE id = ?
    `, [newAmountPaid, newBalanceDue, newStatus, now, id]);

    res.json({ success: true, amount_paid: newAmountPaid, balance_due: newBalanceDue, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status (e.g. mark Sent, Paid, Cancelled)
app.post('/api/invoices/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();
    await query.run(`UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?`, [status, now, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice (draft or unwanted)
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await query.run(`DELETE FROM invoices WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================================================
   PREVIEW & PDF EXPORT ENDPOINTS
   ======================================================== */

// Render clean HTML for preview / printing
app.get('/api/invoices/:id/html', async (req, res) => {
  try {
    const invoice = await query.get(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!invoice) {
      return res.status(404).send('Invoice not found');
    }

    const items = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC`, [invoice.id]);
    const pageSize = req.query.pageSize || 'A4';

    const html = renderInvoiceHtml({ ...invoice, items }, { pageSize, isForPdf: false });
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Generate and download real vector PDF
app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await query.get(`SELECT * FROM invoices WHERE id = ?`, [req.params.id]);
    if (!invoice) {
      return res.status(404).send('Invoice not found');
    }

    const items = await query.all(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY order_index ASC`, [invoice.id]);
    const pageSize = req.query.pageSize || 'A4';

    const html = renderInvoiceHtml({ ...invoice, items }, { pageSize, isForPdf: true });
    const pdfBuffer = await generatePdfFromHtml(html, { pageSize });

    const safeNumber = (invoice.invoice_number || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${safeNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).send(`Failed to generate PDF: ${err.message}`);
  }
});

/* ========================================================
   DASHBOARD STATS ENDPOINT
   ======================================================== */

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalInvoices = await query.get(`SELECT COUNT(*) as count FROM invoices`);
    const totals = await query.get(`
      SELECT 
        COALESCE(SUM(total_due), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_outstanding
      FROM invoices WHERE status != 'cancelled'
    `);

    const statusCounts = await query.all(`
      SELECT status, COUNT(*) as count FROM invoices GROUP BY status
    `);

    const recentInvoices = await query.all(`
      SELECT id, invoice_number, invoice_date, due_date, client_snapshot, total_due, amount_paid, balance_due, status, currency
      FROM invoices ORDER BY created_at DESC LIMIT 6
    `);

    const parsedRecent = recentInvoices.map(inv => ({
      ...inv,
      client_snapshot: inv.client_snapshot ? JSON.parse(inv.client_snapshot) : null
    }));

    const statusMap = {
      draft: 0,
      sent: 0,
      partially_paid: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0
    };
    statusCounts.forEach(s => {
      statusMap[s.status] = s.count;
    });

    res.json({
      totalInvoices: totalInvoices.count,
      totalInvoiced: totals.total_invoiced,
      totalPaid: totals.total_paid,
      totalOutstanding: totals.total_outstanding,
      statusBreakdown: statusMap,
      recentInvoices: parsedRecent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================================================
   SYSTEM RESET & WORKSPACE MANAGEMENT ENDPOINTS
   ======================================================== */

// Reset workspace data (clean slate, clear invoices/clients, or reload demo)
app.post('/api/reset', async (req, res) => {
  try {
    const { mode = 'all' } = req.body;
    const result = await resetDatabase(mode);
    res.json(result);
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset workspace' });
  }
});

// Check whether the app currently contains demo data
app.get('/api/reset/status', async (req, res) => {
  try {
    const profile = await query.get(`SELECT business_name FROM business_profiles WHERE id = 'default'`);
    const sampleInv = await query.get(`SELECT id FROM invoices WHERE id IN ('inv-fauget-01234', 'inv-flux-1382') LIMIT 1`);
    const invoiceCount = await query.get(`SELECT COUNT(*) as count FROM invoices`);
    
    const isSampleData = !!(sampleInv || (profile && profile.business_name === 'Acme Creative Studio'));
    
    res.json({
      isSampleData,
      invoiceCount: invoiceCount ? invoiceCount.count : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve client production build if available
const clientDistDir = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`Invoice server running on http://localhost:${PORT}`);
});
