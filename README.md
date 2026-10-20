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

---

## 🔄 Workspace Reset & Demo Data Management

Invoicr Pro provides instant controls to reset or populate your data:

1. **In-App Reset (UI)**:
   - Navigate to **Business Profile & Settings** → **Data & Reset** tab.
   - **Reset Workspace to Blank**: Clears all sample figures, dummy names (Acme Creative Studio, Alex Morgan), invoices, and clients for a 100% clean slate.
   - **Clear Invoices Only**: Removes invoices and client records while keeping your business profile intact.
   - **Reload Demo Data**: Restores sample Fauget and Flux Studio invoices at any time for testing.

2. **Invoice Editor Form Reset**:
   - Inside the Invoice Editor, click **Reset Form** in the top action bar to wipe all line items and form fields immediately.

3. **CLI Reset**:
   ```powershell
   npm run reset
   ```

---

## 📱 Installing Invoicr Pro as an App (PWA)

Invoicr Pro is built as an installable **Progressive Web App (PWA)** that runs natively without browser toolbars:

- **Desktop (Chrome / Edge)**:
  - Click the **Install App** button in the top navigation bar, or click the install icon in your browser's address bar.
- **iPhone / iPad (iOS Safari)**:
  - Open `http://<your-ip>:5000` or hosted URL in Safari.
  - Tap the **Share** button (`⎋`), scroll down, and select **Add to Home Screen**.
- **Android (Chrome)**:
  - Tap **Install App** in the header or select **Install App / Add to Home screen** from the 3-dot menu.

---

## 🐙 Pushing to GitHub

The repository is already initialized and committed locally with Git. To push it to your GitHub account:

1. **Create an empty repository** on [GitHub.com](https://github.com/new) (e.g. named `invoice-app`). Do not initialize with a README or license.

2. **Link the remote and push**:
   ```powershell
   # Add your GitHub repository as origin
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/invoice-app.git

   # Push to main branch
   git push -u origin main
   ```

