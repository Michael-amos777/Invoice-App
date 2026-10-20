# Invoicr Pro — Professional Customizable Invoice Generator

A complete, responsive web application for creating professional invoices and exporting them as real vector PDF files. Designed for freelancers, agencies, consultants, and businesses of any size.

---

## 🌟 Visual Direction & Reference Matching

Invoicr Pro faithfully replicates the layout, typography, information hierarchy, and aesthetic feel of both reference invoice designs:

1. **Executive Elegance (Reference 1 - Fauget Ski Service)**:
   - Soft, warm linen background (`#F5F2EB`)
   - Organic top-right ocean teal gradient arc (`#0E6973` to `#208B99`)
   - Uppercase `INVOICE` title with sequential number and issue dates
   - Clean `PAYABLE TO` and `BANK DETAILS` columns
   - Line items table housed within a pill-cornered teal banner header and pure white container
   - Floating deep navy pill footer bar (`#072832`) with website, phone, and email icons
   - Left-aligned notes block and right-aligned clean totals card

2. **Modern Studio (Reference 2 - Flux Studio)**:
   - Pitch black background (`#000000`) with high-contrast typography
   - Bold title with electric neon green badge (`#00FF41`) for the invoice number
   - Dual-column header with "Billed To" and brand identity
   - Solid neon green table header and full-width neon total bar

---

## 🚀 Key Features

- **Configure Once, Invoice in Seconds**: Set up business name, logo, contact info, banking details, default terms, and brand colors once. All future invoices auto-populate seamlessly.
- **Snapshot Immutability**: Historical business and banking details are frozen at the exact time an invoice is issued. Updating settings in the future does not alter existing invoices.
- **Dual Pricing Modes**:
  - **Fixed Price**: Enter item description, rate, and quantity.
  - **Hourly Billing**: Enter hourly rate, hours worked, and minutes. Automatically calculates using the exact formula:
    $$\text{Total} = \text{Hourly Rate} \times \left(\text{Hours} + \frac{\text{Minutes}}{60}\right)$$
    *(e.g., 6h 28m at \$20.00/h = \$129.33)*
  - Mix and match fixed and hourly line items on the same invoice.
- **Real Vector PDF Export**: Generates true Chromium vector PDFs using Microsoft Edge headless (`--print-to-pdf`), ensuring vector typography, crisp logos, proper A4 / US Letter pagination, and no cut-off content.
- **Client Directory**: Save, edit, and search clients. Select an existing client during invoice creation to instantly auto-fill their billing information.
- **Invoice Lifecycle & Payments**: Track invoices across statuses (`Draft`, `Sent`, `Partially Paid`, `Paid`, `Overdue`, `Cancelled`). Record partial or full payments with automatic balance calculation.
- **Financial Dashboard**: Real-time metrics on Total Invoiced, Received, Outstanding Balance, and invoice distribution.

---

## 💻 Quickstart

### Prerequisites
- Node.js (v18+)
- Microsoft Edge (pre-installed on Windows)

### Running the Application

1. Open a terminal in the project directory:
   ```powershell
   cd c:\Users\USER\Desktop\invoice-app
   ```

2. Start the unified production server (serves both API and Web UI):
   ```powershell
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

### Running Automated Tests

Run the built-in test suite:
```powershell
npm test
```
All tests verify:
- Fixed-price line item calculations
- Hourly line item calculations with fractional minute rounding
- Mixed invoice totals with discounts and tax
- Payment recordings and status transitions
- End-to-end API lifecycle
- Microsoft Edge headless binary vector PDF generation (`%PDF-`)

---

## 📁 Project Structure

```
invoice-app/
├── client/                     # Frontend React + TypeScript application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.tsx       # Top navigation bar
│   │   │   ├── Dashboard.tsx        # Financial metrics & recent invoices
│   │   │   ├── InvoiceEditor.tsx    # Dual-mode invoice creation form
│   │   │   ├── InvoiceDocument.tsx  # Pixel-perfect reference template renderer
│   │   │   ├── InvoiceList.tsx      # Invoices table with search & filters
│   │   │   ├── InvoiceViewer.tsx    # Standalone document viewer & export
│   │   │   ├── ClientsList.tsx      # Client directory & billing history
│   │   │   ├── ProfileSettings.tsx  # Branding, banking, & numbering setup
│   │   │   └── PaymentModal.tsx     # Payment recording modal
│   │   ├── types/index.ts           # TypeScript interfaces
│   │   ├── utils/calculations.ts    # Precision financial calculations
│   │   └── api/index.ts             # Typed REST API client
│   └── dist/                        # Production build
├── server/                     # Backend Express REST API
│   ├── src/
│   │   ├── db.js                    # SQLite database schema & queries
│   │   ├── index.js                 # Express server & API endpoints
│   │   └── utils/
│   │       ├── calculations.js      # Precision financial formulas
│   │       ├── templateRenderer.js  # HTML generator for reference invoices
│   │       └── pdfGenerator.js      # Edge headless vector PDF generator
│   ├── test/                        # Automated test suite
│   │   ├── calculations.test.js     # Formula unit tests
│   │   ├── pdfGenerator.test.js     # Edge PDF tests
│   │   └── api.test.js              # Full API integration tests
│   ├── database.sqlite              # Persistent SQLite database
│   └── seed-samples.js              # Script to seed reference invoices
└── README.md
```
