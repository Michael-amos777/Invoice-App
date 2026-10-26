import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

  // Render the invoice DOM tree to a high-resolution canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x device scale ensures crisp vector-like typography and sharp logos
    useCORS: true,
    allowTaint: false, // Strict false: prevents DOMException SecurityError on toDataURL
    backgroundColor: '#ffffff',
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
