import React, { useState, useEffect } from 'react';
import { Invoice, BusinessProfile } from '../types';
import { InvoiceDocument } from './InvoiceDocument';
import { PaymentModal } from './PaymentModal';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  DollarSign, 
  Copy, 
  Edit3, 
  CheckCircle2, 
  FileText,
  Clock,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface InvoiceViewerProps {
  invoiceId: string;
  profile: BusinessProfile;
  onBack: () => void;
  onEdit: (invoiceId: string) => void;
  onRefresh: () => void;
}

export const InvoiceViewer: React.FC<InvoiceViewerProps> = ({
  invoiceId,
  profile,
  onBack,
  onEdit,
  onRefresh
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<'fauget' | 'studio'>('fauget');

  const fetchInvoice = () => {
    setIsLoading(true);
    fetch(`/api/invoices/${invoiceId}`)
      .then(res => {
        if (!res.ok) throw new Error('Invoice not found');
        return res.json();
      })
      .then(data => {
        setInvoice(data);
        setActiveTemplate(data.template || 'fauget');
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate invoice');
      const dup = await res.json();
      onEdit(dup.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchInvoice();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading invoice document...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Invoice not found</h3>
        <p className="text-sm text-slate-500">{error || 'Unable to display invoice.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Invoice {invoice.invoice_number}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                invoice.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                invoice.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <span className="font-semibold text-slate-800">{invoice.client_snapshot?.name || 'Client'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Template Toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTemplate('fauget')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTemplate === 'fauget' ? 'bg-white shadow-xs text-teal-800' : 'text-slate-500'}`}
            >
              Executive (Ref 1)
            </button>
            <button
              onClick={() => setActiveTemplate('studio')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTemplate === 'studio' ? 'bg-black text-white shadow-xs' : 'text-slate-500'}`}
            >
              Studio (Ref 2)
            </button>
          </div>

          {/* Page size toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPageSize('A4')}
              className={`px-2.5 py-1.5 rounded-lg transition ${pageSize === 'A4' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
            >
              A4
            </button>
            <button
              onClick={() => setPageSize('Letter')}
              className={`px-2.5 py-1.5 rounded-lg transition ${pageSize === 'Letter' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
            >
              Letter
            </button>
          </div>

          {/* Record payment button */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Duplicate button */}
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Duplicate Invoice"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download PDF button */}
          <a
            href={`/api/invoices/${invoice.id}/pdf?pageSize=${pageSize}&template=${activeTemplate}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Standalone Document Viewer Sheet */}
      <div className="bg-slate-200/60 p-4 sm:p-10 rounded-3xl overflow-x-auto flex justify-center shadow-inner">
        <div className="shadow-2xl rounded-none transition-all duration-300">
          <InvoiceDocument
            invoice={{ ...invoice, template: activeTemplate }}
            profile={profile}
            pageSize={pageSize}
          />
        </div>
      </div>

      {/* Payment Recording Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          invoice={invoice}
          isOpen={true}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchInvoice();
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
