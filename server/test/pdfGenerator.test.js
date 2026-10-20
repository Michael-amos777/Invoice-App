import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePdfFromHtml } from '../src/utils/pdfGenerator.js';

test('Generates real binary vector PDF using Microsoft Edge', async () => {
  const html = `<!DOCTYPE html><html><body><h1>Test Invoice</h1><p>Invoice #INV-001</p></body></html>`;
  const pdfBuffer = await generatePdfFromHtml(html, { pageSize: 'A4' });

  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.ok(pdfBuffer.length > 500);
  // All valid PDFs begin with %PDF-
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});
