import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  filename?: string;
  pageSize?: 'A4' | 'Letter';
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

  // Render the invoice DOM tree to a high-resolution canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x device scale ensures crisp vector-like typography and sharp logos
    useCORS: true,
    allowTaint: true,
    backgroundColor: null, // Preserves the exact background of the invoice template
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

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
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Append further pages if the invoice content exceeds one page
  while (heightLeft > 3) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  // Trigger immediate native file download
  pdf.save(safeFilename);
}
