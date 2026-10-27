import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Invoice, BusinessProfile } from '../types';
import { InvoiceDocument } from '../components/InvoiceDocument';

export interface ExportPdfOptions {
  filename?: string;
  pageSize?: 'A4' | 'Letter';
}

/**
 * Converts an image element's source to an inline base64 Data URI
 * so html2canvas never encounters cross-origin canvas tainting.
 */
async function inlineImageAsBase64(img: HTMLImageElement): Promise<void> {
  if (!img.src || img.src.startsWith('data:')) return;
  try {
    const res = await fetch(img.src, { mode: 'cors' });
    if (!res.ok) return;
    const blob = await res.blob();
    await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  } catch {
    // If fetching fails, preserve existing src; allowTaint: false prevents crashes
  }
}

/**
 * Exports an HTML element directly to a downloadable PDF file inside the browser.
 * Works seamlessly across mobile (iOS/Android) and desktop without depending on server memory or cold starts.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    filename = 'invoice.pdf',
    pageSize = 'A4'
  } = options;

  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Pre-process any images inside the element to inline base64 to prevent canvas tainting
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(img => inlineImageAsBase64(img)));

  const isDark = element.querySelector('.bg-black') !== null;

  // Render the invoice DOM tree to a high-resolution canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x device scale ensures crisp vector-like typography and sharp logos
    useCORS: true,
    allowTaint: false, // Strict false: prevents DOMException SecurityError on toDataURL
    backgroundColor: isDark ? '#000000' : '#ffffff',
    logging: false,
    imageTimeout: 8000,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  // Export image data (JPEG provides clean compression and fast PDF embedding)
  let imgData: string;
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.96);
  } catch {
    imgData = canvas.toDataURL('image/png', 1.0);
  }

  // Define PDF page dimensions in millimeters
  const isLetter = pageSize === 'Letter';
  const pdfWidth = isLetter ? 215.9 : 210;
  const pdfHeight = isLetter ? 279.4 : 297;
  const format = isLetter ? 'letter' : 'a4';

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format
  });

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add the first page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Append further pages if the invoice content exceeds one page
  while (heightLeft > 3) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  // Trigger immediate native file download
  pdf.save(safeFilename);
}

/**
 * Off-screen rendering fallback: mounts InvoiceDocument in a hidden container,
 * generates the PDF using html2canvas & jsPDF, and immediately cleans up the container.
 */
async function renderOffscreenAndExport(
  invoice: Invoice | Partial<Invoice>,
  profile?: BusinessProfile | null,
  pageSize: 'A4' | 'Letter' = 'A4',
  filename: string = 'invoice.pdf'
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = pageSize === 'Letter' ? '800px' : '794px';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  try {
    const root = createRoot(container);
    root.render(
      React.createElement(InvoiceDocument, {
        invoice,
        profile: profile || undefined,
        pageSize
      })
    );

    // Allow DOM layout and fonts to resolve
    await new Promise(resolve => setTimeout(resolve, 300));

    await exportElementToPdf(container, { filename, pageSize });
    root.unmount();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Universal invoice PDF download orchestrator:
 * 1. Attempts to fetch the native vector PDF from the server endpoint.
 * 2. If the server is offline or fails, falls back gracefully to in-browser client generation.
 * 3. Never downloads error pages as .htm files.
 */
export async function downloadInvoiceWithFallback(
  invoice: Invoice | Partial<Invoice>,
  profile?: BusinessProfile | null,
  pageSize: 'A4' | 'Letter' = 'A4',
  existingElement?: HTMLElement | null
): Promise<void> {
  const safeNumber = (invoice.invoice_number || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Invoice-${safeNumber}.pdf`;

  // 1. Try server-side generation
  if (invoice.id) {
    try {
      const template = invoice.template || 'fauget';
      const response = await fetch(`/api/invoices/${invoice.id}/pdf?pageSize=${pageSize}&template=${template}`, {
        headers: {
          'Accept': 'application/pdf'
        }
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && (contentType.includes('application/pdf') || contentType.includes('octet-stream'))) {
        const blob = await response.blob();
        if (blob.size > 200) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          return;
        }
      }
      console.warn('Server PDF endpoint did not return valid PDF, falling back to client-side generation:', response.status);
    } catch (networkErr) {
      console.warn('Network error requesting server PDF, falling back to client-side generation:', networkErr);
    }
  }

  // 2. Client-side fallback: use existing mounted element if available
  if (existingElement) {
    await exportElementToPdf(existingElement, { filename, pageSize });
    return;
  }

  // 3. Client-side fallback: render offscreen and export
  await renderOffscreenAndExport(invoice, profile, pageSize, filename);
}
