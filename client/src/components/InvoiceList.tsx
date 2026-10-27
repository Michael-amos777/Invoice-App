import React, { useState } from 'react';
import { Invoice, BusinessProfile, Client } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/calculations';
import { PaymentModal } from './PaymentModal';
import { downloadInvoiceWithFallback } from '../utils/pdfExport';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle, 
  DollarSign, 
  XCircle, 
  Plus, 
  FileText,
  Calendar,
  MoreVertical,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  profile: BusinessProfile | null;
  clients: Client[];
  onNewInvoice: () => void;
  onEditInvoice: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onRefresh: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  profile,
  clients,
  onNewInvoice,
  onEditInvoice,
  onViewInvoice,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [actionDropdownId, setActionDropdownId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      let fullInv = inv;
      if (!inv.items || inv.items.length === 0) {
        try {
          const res = await fetch(`/api/invoices/${inv.id}`);
          if (res.ok) {
            fullInv = await res.json();
          }
        } catch {}
      }
      await downloadInvoiceWithFallback(fullInv, profile, 'A4');
    } catch (err) {
      console.error('Failed to download invoice:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter invoices
  const filtered = invoices.filter(inv => {
    // Status filter
    if (statusFilter !== 'all' && inv.status !== statusFilter) {
      return false;
    }
    // Client filter
    if (clientFilter !== 'all' && inv.client_id !== clientFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const numMatch = inv.invoice_number.toLowerCase().includes(q);
      const projMatch = (inv.project_name || '').toLowerCase().includes(q);
      const clientNameMatch = (inv.client_snapshot?.name || '').toLowerCase().includes(q);
      const clientCompanyMatch = (inv.client_snapshot?.company_name || '').toLowerCase().includes(q);
      const descMatch = (inv.description || '').toLowerCase().includes(q);
      return numMatch || projMatch || clientNameMatch || clientCompanyMatch || descMatch;
    }
    return true;
  });

  const handleDuplicate = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate invoice');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (invoiceId: string, status: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
      sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
      partially_paid: { label: 'Partially Paid', bg: 'bg-amber-50', text: 'text-amber-700' },
      paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      overdue: { label: 'Overdue', bg: 'bg-rose-50', text: 'text-rose-700' },
      cancelled: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-400' }
    };
    const c = config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoice History</h1>
          <p className="text-xs text-slate-500">Manage, search, and export all issued and draft invoices</p>
        </div>

        <button
          onClick={onNewInvoice}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, client, company, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            />
          </div>

          {/* Client Filter */}
          <div className="md:col-span-3">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quick status tabs */}
        <div className="flex gap-1 overflow-x-auto pt-2 border-t border-slate-100 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'draft', label: 'Drafts' },
            { id: 'sent', label: 'Sent' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === tab.id 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Invoice #</th>
                <th className="py-3.5 px-6">Client / Project</th>
                <th className="py-3.5 px-6">Date & Due</th>
                <th className="py-3.5 px-6 text-right">Total Due</th>
                <th className="py-3.5 px-6 text-right">Balance Due</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length > 0 ? (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition group">
                    {/* Invoice Number */}
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="hover:text-teal-700 transition flex items-center gap-1.5"
                      >
                        <span>{inv.invoice_number}</span>
                      </button>
                      <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">
                        {inv.template === 'studio' ? 'Studio Dark' : 'Fauget Teal'}
                      </div>
                    </td>

                    {/* Client & Project */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {inv.client_snapshot?.name || 'Client'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {inv.project_name || inv.client_snapshot?.company_name || 'General Service'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-xs text-slate-500">
                      <div>Issued: <span className="font-medium text-slate-700">{formatDisplayDate(inv.invoice_date)}</span></div>
                      {inv.due_date && (
                        <div>Due: <span className="text-slate-600">{formatDisplayDate(inv.due_date)}</span></div>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.total_due, inv.currency)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-4 px-6 text-right font-mono text-xs">
                      {Number(inv.balance_due) > 0 ? (
                        <span className="font-bold text-amber-700">
                          {formatCurrency(inv.balance_due, inv.currency)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Paid</span>
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Action */}
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                          title="View Invoice Sheet"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF Action */}
                        <button
                          type="button"
                          onClick={() => handleDownload(inv)}
                          disabled={downloadingId === inv.id}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                          title="Download Invoice PDF"
                        >
                          {downloadingId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit Draft */}
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => onEditInvoice(inv.id)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                            title="Edit Draft"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Record Payment */}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setActivePaymentInvoice(inv)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(inv.id)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Delete Draft / Cancel */}
                        {inv.status === 'draft' ? (
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(inv.id, 'cancelled')}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-base">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment recording modal */}
      {activePaymentInvoice && (
        <PaymentModal
          invoice={activePaymentInvoice}
          isOpen={true}
          onClose={() => setActivePaymentInvoice(null)}
          onPaymentSuccess={() => {
            setActivePaymentInvoice(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
