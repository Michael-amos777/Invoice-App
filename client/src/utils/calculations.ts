import { InvoiceItem } from '../types';

export function roundToTwoDecimals(num: number): number {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates line item total.
 * For fixed: amount or (rate * quantity)
 * For hourly: Hourly Rate * (Hours + Minutes / 60)
 * Example: 6 hrs 28 mins @ $20 = $129.33
 */
export function calculateItemTotal(item: Partial<InvoiceItem>): number {
  if (item.item_type === 'hourly') {
    const rate = Number(item.rate) || 0;
    const hours = Number(item.hours) || 0;
    const minutes = Number(item.minutes) || 0;
    const totalTimeHours = hours + (minutes / 60);
    const total = rate * totalTimeHours;
    return roundToTwoDecimals(total);
  } else {
    // Fixed price mode
    const rate = Number(item.rate) || 0;
    const quantity = item.quantity !== undefined && item.quantity !== null && String(item.quantity) !== ''
      ? Number(item.quantity)
      : 1;
    return roundToTwoDecimals(rate * quantity);
  }
}

export function calculateInvoiceTotals(
  items: Partial<InvoiceItem>[] = [],
  discount: { type: 'none' | 'percentage' | 'fixed'; value: number } = { type: 'none', value: 0 },
  tax: { rate: number; name: string } = { rate: 0, name: 'Tax' },
  amountPaid: number = 0
) {
  const calculatedItems = items.map(item => ({
    ...item,
    total: calculateItemTotal(item)
  }));

  const subtotal = roundToTwoDecimals(
    calculatedItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
  );

  let discountAmount = 0;
  if (discount.type === 'percentage') {
    const pct = Math.max(0, Math.min(100, Number(discount.value) || 0));
    discountAmount = roundToTwoDecimals((subtotal * pct) / 100);
  } else if (discount.type === 'fixed') {
    discountAmount = roundToTwoDecimals(Math.min(subtotal, Math.max(0, Number(discount.value) || 0)));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Math.max(0, Number(tax.rate) || 0);
  const taxAmount = roundToTwoDecimals((taxableAmount * taxRate) / 100);

  const totalDue = roundToTwoDecimals(taxableAmount + taxAmount);
  const paid = roundToTwoDecimals(Math.max(0, Number(amountPaid) || 0));
  const balanceDue = roundToTwoDecimals(Math.max(0, totalDue - paid));

  let derivedStatus: 'draft' | 'paid' | 'partially_paid' = 'draft';
  if (paid >= totalDue && totalDue > 0) {
    derivedStatus = 'paid';
  } else if (paid > 0 && paid < totalDue) {
    derivedStatus = 'partially_paid';
  }

  return {
    calculatedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    totalDue,
    amountPaid: paid,
    balanceDue,
    derivedStatus
  };
}

export function formatCurrency(amount: number | string | undefined, currencyCode: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'AU$',
    JPY: '¥',
    CHF: 'CHF ',
    INR: '₹',
    NZD: 'NZ$',
    SGD: 'SG$'
  };

  const symbol = symbols[currencyCode] || `${currencyCode} `;
  const num = Number(amount) || 0;
  const formattedNumber = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formattedNumber}`;
}

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD to DD/MM/YYYY
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
