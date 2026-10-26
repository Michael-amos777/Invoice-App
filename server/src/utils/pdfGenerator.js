import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

import fsSync from 'fs';

function getBrowserPath() {
  if (process.env.CHROMIUM_PATH && fsSync.existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  if (process.env.CHROME_BIN && fsSync.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of winPaths) {
      if (fsSync.existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    const macPaths = [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of macPaths) {
      if (fsSync.existsSync(p)) return p;
    }
  } else {
    // Linux
    const linuxPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium'
    ];
    for (const p of linuxPaths) {
      if (fsSync.existsSync(p)) return p;
    }
  }
  return 'msedge';
}

export async function generatePdfFromHtml(htmlContent, options = {}) {
  const { pageSize = 'A4' } = options;
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const tempHtmlPath = path.join(tempDir, `invoice_${id}.html`);
  const tempPdfPath = path.join(tempDir, `invoice_${id}.pdf`);

  try {
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf8');

    const browserBin = getBrowserPath();
    // Run headless Chromium/Edge to produce 100% native Chromium vector PDF
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=${tempPdfPath}`,
      `file:///${tempHtmlPath.replace(/\\/g, '/')}`
    ];

    await new Promise((resolve, reject) => {
      execFile(browserBin, args, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) {
          // If --headless=new had an issue, fallback to legacy --headless
          execFile(browserBin, [
            '--headless',
            '--no-sandbox',
            '--disable-setuid-sandbox',
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
