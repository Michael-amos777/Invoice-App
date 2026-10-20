import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export async function generatePdfFromHtml(htmlContent, options = {}) {
  const { pageSize = 'A4' } = options;
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const tempHtmlPath = path.join(tempDir, `invoice_${id}.html`);
  const tempPdfPath = path.join(tempDir, `invoice_${id}.pdf`);

  try {
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf8');

    // Run Microsoft Edge headless to produce 100% native Chromium vector PDF
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=${tempPdfPath}`,
      `file:///${tempHtmlPath.replace(/\\/g, '/')}`
    ];

    await new Promise((resolve, reject) => {
      execFile(EDGE_PATH, args, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) {
          // If --headless=new had an issue, fallback to legacy --headless
          execFile(EDGE_PATH, [
            '--headless',
            '--disable-gpu',
            '--no-pdf-header-footer',
            `--print-to-pdf=${tempPdfPath}`,
            `file:///${tempHtmlPath.replace(/\\/g, '/')}`
          ], { timeout: 15000 }, (err2) => {
            if (err2) reject(err2);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });

    const pdfBuffer = await fs.readFile(tempPdfPath);
    return pdfBuffer;
  } finally {
    // Clean up temporary files
    try { await fs.unlink(tempHtmlPath); } catch (e) {}
    try { await fs.unlink(tempPdfPath); } catch (e) {}
  }
}
