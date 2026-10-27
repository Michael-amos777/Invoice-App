import { execFile } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { pathToFileURL } from 'url';

export function getBrowserPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fsSync.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
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
    return 'msedge';
  } else if (process.platform === 'darwin') {
    const macPaths = [
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    for (const p of macPaths) {
      if (fsSync.existsSync(p)) return p;
    }
    return null;
  } else {
    // Linux (Railway, Render, Docker, Ubuntu, Debian, Nixpacks)
    const linuxPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/etc/profiles/per-user/root/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium'
    ];
    for (const p of linuxPaths) {
      if (fsSync.existsSync(p)) return p;
    }
    return null;
  }
}

export async function generatePdfFromHtml(htmlContent, options = {}) {
  const browserBin = getBrowserPath();
  if (!browserBin) {
    throw new Error('No headless Chromium browser binary found on this system');
  }

  const { pageSize = 'A4' } = options;
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const tempHtmlPath = path.join(tempDir, `invoice_${id}.html`);
  const tempPdfPath = path.join(tempDir, `invoice_${id}.pdf`);

  try {
    await fs.writeFile(tempHtmlPath, htmlContent, 'utf8');

    // Convert OS path to RFC-compliant file:/// URL (3 slashes on both Linux and Windows)
    const fileUrl = pathToFileURL(tempHtmlPath).href;

    const baseFlags = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-pdf-header-footer'
    ];

    if (process.platform === 'linux') {
      baseFlags.push('--disable-software-rasterizer');
    }

    const args = [
      '--headless=new',
      ...baseFlags,
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=${tempPdfPath}`,
      fileUrl
    ];

    await new Promise((resolve, reject) => {
      execFile(browserBin, args, { timeout: 25000 }, (error) => {
        if (error) {
          // If --headless=new encounters issues, fallback to legacy --headless
          const legacyArgs = [
            '--headless',
            ...baseFlags,
            `--print-to-pdf=${tempPdfPath}`,
            fileUrl
          ];
          execFile(browserBin, legacyArgs, { timeout: 25000 }, (err2) => {
            if (err2) reject(err2);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });

    const pdfBuffer = await fs.readFile(tempPdfPath);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Chromium produced an empty PDF');
    }
    return pdfBuffer;
  } finally {
    try { await fs.unlink(tempHtmlPath); } catch {}
    try { await fs.unlink(tempPdfPath); } catch {}
  }
}
