import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateItemTotal, calculateInvoiceTotals } from '../src/utils/calculations.js';

test('Calculates Fixed Price line item correctly', () => {
  const item = {
    item_type: 'fixed',
    rate: 175.00,
    quantity: 1
  };
  const total = calculateItemTotal(item);
  assert.equal(total, 175.00);
});

test('Calculates Hourly line item with Hours and Minutes exact example from specification', () => {
  // Spec: 6 hours and 28 minutes at $20/hour must calculate to $129.33
  const item = {
    item_type: 'hourly',
    rate: 20,
    hours: 6,
    minutes: 28
  };
  const total = calculateItemTotal(item);
  assert.equal(total, 129.33);
});

test('Calculates mixed invoice with hourly, fixed, percentage discount and tax', () => {
  const items = [
    { item_type: 'hourly', rate: 20, hours: 6, minutes: 28 }, // 129.33
    { item_type: 'fixed', rate: 100, quantity: 2 } // 200.00
  ];
  // Subtotal = 329.33
  // 10% discount = 32.933 -> 32.93
  // Taxable = 296.40
  // Tax 10% = 29.64
  // Total = 326.04
  const res = calculateInvoiceTotals(items, { type: 'percentage', value: 10 }, { rate: 10, name: 'Tax' }, 100);
  
  assert.equal(res.subtotal, 329.33);
  assert.equal(res.discountAmount, 32.93);
  assert.equal(res.taxableAmount, 296.40);
  assert.equal(res.taxAmount, 29.64);
  assert.equal(res.totalDue, 326.04);
  assert.equal(res.amountPaid, 100.00);
  assert.equal(res.balanceDue, 226.04);
  assert.equal(res.derivedStatus, 'partially_paid');
});

test('Handles full payment correctly', () => {
  const items = [
    { item_type: 'fixed', rate: 500, quantity: 1 }
  ];
  const res = calculateInvoiceTotals(items, { type: 'none', value: 0 }, { rate: 0 }, 500);
  assert.equal(res.totalDue, 500.00);
  assert.equal(res.balanceDue, 0.00);
  assert.equal(res.derivedStatus, 'paid');
});
