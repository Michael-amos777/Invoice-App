import React from 'react';
import { Invoice, BusinessProfile, Client } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/calculations';
import { Globe, Phone, Mail, Building, Landmark } from 'lucide-react';

interface InvoiceDocumentProps {
  invoice: Partial<Invoice>;
  profile?: BusinessProfile | Partial<BusinessProfile>;
  client?: Client | null;
  pageSize?: 'A4' | 'Letter';
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  profile,
  client,
  pageSize = 'A4'
}) => {
  // Use frozen snapshots from invoice if present, else fallback to live profile/client
  const biz = (invoice.business_snapshot as Partial<BusinessProfile>) || profile || {};
  const clientData = (invoice.client_snapshot as Client) || client || {};
  const items = invoice.items || [];
  const template = invoice.template || biz.selected_template || 'fauget';

  const primaryColor = biz.primary_color || '#0E6973';
  const secondaryColor = biz.secondary_color || '#208B99';
  const currency = invoice.currency || biz.default_currency || 'USD';
  const font = biz.preferred_font || 'Plus Jakarta Sans';

  const pageDimensions = pageSize === 'Letter' 
    ? 'w-full max-w-[800px] min-h-[1030px]' 
    : 'w-full max-w-[794px] min-h-[1123px]';

  if (template === 'studio') {
    return (
      <div 
        className={`${pageDimensions} mx-auto bg-black text-white p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between font-sans selection:bg-[#00FF41] selection:text-black rounded-lg sm:rounded-none`}
        style={{ fontFamily: `'${font}', sans-serif` }}
      >
        <div>
          {/* Studio Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">Invoice</span>
              <span 
                className="text-black font-extrabold text-xl px-3 py-1 rounded"
                style={{ backgroundColor: primaryColor }}
              >
                {invoice.invoice_number || '#1001'}
              </span>
            </div>
            <div className="text-left sm:text-right text-zinc-300 text-sm space-y-1">
              <div>Issued: <span className="font-semibold text-white">{formatDisplayDate(invoice.invoice_date)}</span></div>
              {invoice.due_date && <div>Due: <span className="font-semibold text-white">{formatDisplayDate(invoice.due_date)}</span></div>}
              {invoice.purchase_order && <div>PO: <span className="text-white">{invoice.purchase_order}</span></div>}
            </div>
          </div>

          {/* Billed To & Brand */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-10">
            <div className="text-sm space-y-1 text-zinc-300 max-w-xs">
              <div className="font-bold text-white uppercase tracking-wider text-xs mb-2">Billed To:</div>
              <div className="text-lg font-bold text-white">{clientData.name || 'Client Name'}</div>
              {clientData.company_name && <div className="text-zinc-200">{clientData.company_name}</div>}
              {clientData.billing_address && <div className="text-zinc-400 whitespace-pre-line">{clientData.billing_address}</div>}
              {clientData.phone && <div className="text-zinc-400">{clientData.phone}</div>}
              {clientData.email && <div className="text-zinc-400">{clientData.email}</div>}
            </div>

            <div className="flex items-center gap-4 text-left sm:text-right">
              {biz.logo_url && (
                <img 
                  src={biz.logo_url} 
                  alt={biz.business_name || 'Logo'} 
                  className="max-h-16 max-w-[130px] object-contain rounded"
                />
              )}
              {(!biz.logo_url || ((biz as any).show_name_with_logo !== false && (biz as any).show_name_with_logo !== 0)) && (
                <div>
                  <div className={`${biz.logo_url ? 'text-base sm:text-lg font-bold text-zinc-100' : 'text-2xl sm:text-3xl font-extrabold text-white'} tracking-tight leading-none`}>
                    {biz.business_name || 'Flux Studio'}
                  </div>
                  {biz.owner_name && (
                    <div className="text-xs text-zinc-400 mt-1">{biz.owner_name}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-10 overflow-hidden rounded">
            <div 
              className="text-black font-extrabold text-xs uppercase tracking-wider grid grid-cols-12 px-4 py-3 items-center"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="col-span-6 sm:col-span-7">Description</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-center">Qty / Time</div>
              <div className="col-span-2 sm:col-span-1 text-right">Subtotal</div>
            </div>

            <div className="divide-y divide-zinc-800 bg-zinc-950/50">
              {items.map((item, index) => {
                const qtyStr = item.item_type === 'hourly'
                  ? `${item.hours || 0}h ${item.minutes ? item.minutes + 'm' : ''}`
                  : (item.quantity !== undefined ? item.quantity : 1);
                const rateStr = formatCurrency(item.rate, currency);
                const totalStr = formatCurrency(item.total, currency);

                return (
                  <div key={item.id || index} className="grid grid-cols-12 px-4 py-3.5 text-sm items-center hover:bg-zinc-900/40 transition">
                    <div className="col-span-6 sm:col-span-7 pr-2">
                      <div className="font-semibold text-white">{item.description || 'Service Item'}</div>
                      {item.project && <div className="text-xs text-zinc-400 mt-0.5">{item.project}</div>}
                    </div>
                    <div className="col-span-2 text-right text-zinc-300 font-mono text-xs sm:text-sm">{rateStr}</div>
                    <div className="col-span-2 text-center text-zinc-300 text-xs sm:text-sm">{qtyStr}</div>
                    <div className="col-span-2 sm:col-span-1 text-right font-bold text-white font-mono text-xs sm:text-sm">{totalStr}</div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-sm">
                  No line items added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Summary & Banking */}
        <div className="mt-auto space-y-6">
          <div className="flex flex-col items-end space-y-2 text-sm text-zinc-300 pr-1">
            <div className="flex justify-between w-64">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-white">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between w-64 text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(invoice.discount_amount, currency)}</span>
              </div>
            )}

            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between w-64">
                <span>{invoice.tax_name || 'Tax'} ({invoice.tax_rate}%):</span>
                <span className="font-mono font-medium text-white">{formatCurrency(invoice.tax_amount, currency)}</span>
              </div>
            )}
          </div>

          <div 
            className="text-black font-black text-xl sm:text-2xl px-6 py-4 rounded flex justify-between items-center tracking-tight"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Total</span>
            <span className="font-mono">{formatCurrency(invoice.total_due, currency)}</span>
          </div>

          {Number(invoice.amount_paid) > 0 && (
            <div className="flex justify-between items-center bg-zinc-900 px-6 py-3 rounded text-sm font-semibold">
              <span className="text-emerald-400">Amount Paid</span>
              <span className="font-mono text-emerald-400">-{formatCurrency(invoice.amount_paid, currency)}</span>
              <span className="text-white ml-4">Remaining:</span>
              <span className="font-mono text-white text-base">{formatCurrency(invoice.balance_due, currency)}</span>
            </div>
          )}

          {/* Banking footer */}
          {(biz.bank_name || biz.bank_account_number) && (
            <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-400 flex flex-wrap gap-x-6 gap-y-1">
              <div><strong className="text-zinc-200">Bank:</strong> {biz.bank_name}</div>
              <div><strong className="text-zinc-200">Account:</strong> {biz.bank_account_number}</div>
              {biz.bank_routing_number && <div><strong className="text-zinc-200">Routing:</strong> {biz.bank_routing_number}</div>}
              {biz.bank_iban && <div><strong className="text-zinc-200">IBAN:</strong> {biz.bank_iban}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fauget / Executive Elegance Template (Direct match of user reference 1)
  return (
    <div 
      className={`${pageDimensions} mx-auto bg-[#F5F2EB] text-[#122023] p-8 sm:p-12 shadow-2xl relative flex flex-col justify-between font-sans overflow-hidden rounded-lg sm:rounded-none`}
      style={{ fontFamily: `'${font}', sans-serif` }}
    >
      {/* Decorative organic top-right teal gradient arc matching Reference 1 */}
      <div 
        className="absolute -top-36 -right-36 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 60%, transparent 80%)`
        }}
      />
      <div 
        className="absolute top-6 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-25 border-[32px]"
        style={{ borderColor: primaryColor }}
      />

      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex items-center gap-4">
            {biz.logo_url ? (
              <img 
                src={biz.logo_url} 
                alt={biz.business_name || 'Logo'} 
                className="max-h-16 max-w-[140px] object-contain rounded-lg shadow-xs"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {(biz.business_name || 'I').substring(0, 2).toUpperCase()}
              </div>
            )}
            {(!biz.logo_url || ((biz as any).show_name_with_logo !== false && (biz as any).show_name_with_logo !== 0)) && (
              <div>
                <div className={`${biz.logo_url ? 'text-sm sm:text-base font-bold text-[#1a2c31]' : 'text-xl font-black uppercase tracking-wider text-[#0c1a1e]'} leading-tight`}>
                  {biz.business_name || 'FAUGET'}
                </div>
                {biz.owner_name && (
                  <div className="text-xs font-medium text-[#556970] mt-0.5">
                    {biz.owner_name}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-widest text-[#0c1a1e]">
              INVOICE
            </h1>
            <div className="mt-2 text-sm text-[#3b4e54] space-y-0.5">
              <div><span className="font-bold text-[#112328]">Number:</span> {invoice.invoice_number || '01234'}</div>
              <div><span className="font-bold text-[#112328]">Date:</span> {formatDisplayDate(invoice.invoice_date)}</div>
              {invoice.due_date && <div><span className="font-bold text-[#112328]">Due:</span> {formatDisplayDate(invoice.due_date)}</div>}
              {invoice.purchase_order && <div><span className="font-bold text-[#112328]">PO:</span> {invoice.purchase_order}</div>}
            </div>
          </div>
        </div>

        {/* Payable To & Bank Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#0c1a1e] mb-2 flex items-center gap-1.5">
              <span>PAYABLE TO</span>
            </div>
            <div className="text-sm text-[#334449] leading-relaxed space-y-0.5">
              <div className="font-bold text-[#0c1a1e] text-base">{clientData.name || 'Mr. Howard Ong'}</div>
              {clientData.company_name && <div className="font-medium text-slate-700">{clientData.company_name}</div>}
              {clientData.billing_address && <div className="whitespace-pre-line text-slate-600">{clientData.billing_address}</div>}
              {clientData.phone && <div>{clientData.phone}</div>}
              {clientData.email && <div className="text-slate-500">{clientData.email}</div>}
            </div>
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#0c1a1e] mb-2 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#0E6973]" />
              <span>BANK DETAILS</span>
            </div>
            <div className="text-sm text-[#334449] leading-relaxed space-y-0.5">
              <div className="font-bold text-[#0c1a1e]">{biz.bank_name || 'Salford & Co.'}</div>
              {biz.bank_account_name && <div className="text-xs text-slate-600">Acc Name: {biz.bank_account_name}</div>}
              <div className="font-mono text-sm tracking-wide text-slate-800">{biz.bank_account_number || '0123 4567 8901 2345'}</div>
              {biz.bank_iban && <div className="text-xs">IBAN: {biz.bank_iban}</div>}
              {biz.bank_swift_bic && <div className="text-xs">SWIFT: {biz.bank_swift_bic}</div>}
              {biz.bank_routing_number && <div className="text-xs">Routing/Sort: {biz.bank_routing_number}</div>}
              {biz.other_payment_methods && (
                <div className="text-xs text-[#556970] mt-1 pt-1 border-t border-[#e2ddd3]">
                  {biz.other_payment_methods}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Container with Pill Rounded Top matching Reference 1 */}
        <div className="mb-8 rounded-2xl overflow-hidden bg-white shadow-sm border border-[#e8e4dc]">
          <div 
            className="text-white font-black text-xs uppercase tracking-widest grid grid-cols-12 px-6 py-3.5"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="col-span-6 sm:col-span-7">ITEM DESCRIPTION</div>
            <div className="col-span-2 text-center">QTY / TIME</div>
            <div className="col-span-2 text-right">PRICE</div>
            <div className="col-span-2 sm:col-span-1 text-right">TOTAL</div>
          </div>

          <div className="divide-y divide-[#f2efe9]">
            {items.map((item, index) => {
              const qtyStr = item.item_type === 'hourly'
                ? `${item.hours || 0}h ${item.minutes ? item.minutes + 'm' : ''}`
                : (item.quantity !== undefined ? item.quantity : 1);
              const rateStr = formatCurrency(item.rate, currency) + (item.item_type === 'hourly' ? '/h' : '');
              const totalStr = formatCurrency(item.total, currency);

              return (
                <div key={item.id || index} className="grid grid-cols-12 px-6 py-4 text-sm items-center hover:bg-[#faf9f6] transition">
                  <div className="col-span-6 sm:col-span-7 pr-3">
                    <div className="font-semibold text-[#112226]">{item.description || 'Ski Essentials Package'}</div>
                    {item.project && <div className="text-xs text-[#64748b] mt-0.5">{item.project}</div>}
                  </div>
                  <div className="col-span-2 text-center text-[#475a61] text-xs sm:text-sm">{qtyStr}</div>
                  <div className="col-span-2 text-right text-[#475a61] font-mono text-xs sm:text-sm">{rateStr}</div>
                  <div className="col-span-2 sm:col-span-1 text-right font-bold text-[#0c1a1e] font-mono text-xs sm:text-sm">{totalStr}</div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No items added to invoice.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Notes on left, Totals card on right */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start mb-10">
          <div className="sm:col-span-7 pr-4">
            <div className="text-xs font-black uppercase tracking-widest text-[#0c1a1e] mb-2">
              NOTES:
            </div>
            <p className="text-xs text-[#475a61] leading-relaxed">
              {invoice.notes || biz.default_notes || 'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional service and ensuring your highest quality experience.'}
            </p>
            {invoice.terms && (
              <div className="mt-4 pt-3 border-t border-[#e5e0d6]">
                <div className="text-[11px] font-black uppercase tracking-widest text-[#0c1a1e] mb-1">
                  TERMS:
                </div>
                <p className="text-xs text-[#475a61] leading-relaxed">{invoice.terms}</p>
              </div>
            )}
          </div>

          <div className="sm:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#e8e4dc] space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-[#3b4e54] uppercase tracking-wider">
              <span>SUB TOTAL</span>
              <span className="font-mono text-sm text-[#0c1a1e]">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600 uppercase tracking-wider">
                <span>DISCOUNT {invoice.discount_type === 'percentage' ? `(${invoice.discount_value}%)` : ''}</span>
                <span className="font-mono text-sm">-{formatCurrency(invoice.discount_amount, currency)}</span>
              </div>
            )}

            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-[#3b4e54] uppercase tracking-wider">
                <span>{invoice.tax_name || 'TAX'} ({invoice.tax_rate}%)</span>
                <span className="font-mono text-sm text-[#0c1a1e]">{formatCurrency(invoice.tax_amount, currency)}</span>
              </div>
            )}

            <div className="pt-3 border-t-2 border-[#eaeef0] flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-wider text-[#0c1a1e]">GRAND TOTAL</span>
              <span className="text-lg font-black font-mono text-[#0c1a1e]">{formatCurrency(invoice.total_due, currency)}</span>
            </div>

            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="pt-2 flex justify-between items-center text-xs font-bold text-emerald-600 uppercase">
                  <span>AMOUNT PAID</span>
                  <span className="font-mono">-{formatCurrency(invoice.amount_paid, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black uppercase" style={{ color: primaryColor }}>
                  <span>BALANCE DUE</span>
                  <span className="font-mono text-base">{formatCurrency(invoice.balance_due, currency)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Pill Bar matching Reference 1 */}
      <div className="relative z-10 mt-auto bg-[#072832] text-white rounded-full px-8 py-3.5 shadow-lg flex flex-col sm:flex-row items-center justify-around gap-2 text-xs font-medium tracking-wide">
        {biz.website && (
          <div className="flex items-center gap-2 hover:text-[#7DC5C0] transition">
            <Globe className="w-4 h-4 text-[#7DC5C0]" />
            <span>{biz.website.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
        {biz.phone && (
          <div className="flex items-center gap-2 hover:text-[#7DC5C0] transition">
            <Phone className="w-4 h-4 text-[#7DC5C0]" />
            <span>{biz.phone}</span>
          </div>
        )}
        {biz.email && (
          <div className="flex items-center gap-2 hover:text-[#7DC5C0] transition">
            <Mail className="w-4 h-4 text-[#7DC5C0]" />
            <span>{biz.email}</span>
          </div>
        )}
      </div>
    </div>
  );
};
