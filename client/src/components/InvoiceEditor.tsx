import React, { useState, useEffect, useRef } from 'react';
import { 
  Invoice, 
  InvoiceItem, 
  BusinessProfile, 
  Client 
} from '../types';
import { 
  calculateInvoiceTotals, 
  calculateItemTotal, 
  formatCurrency 
} from '../utils/calculations';
import { InvoiceDocument } from './InvoiceDocument';
import { exportElementToPdf } from '../utils/pdfExport';
import { 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  Eye, 
  Save, 
  ArrowLeft, 
  Printer, 
  Download, 
  Sparkles,
  FileCheck2,
  Sliders,
  Layers,
  RotateCcw,
  X,
  Loader2
} from 'lucide-react';

interface InvoiceEditorProps {
  invoiceId?: string | null;
  profile: BusinessProfile;
  clients: Client[];
  onSaveSuccess: (invoiceId: string) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  invoiceId,
  profile,
  clients,
  onSaveSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isDownloadingPreview, setIsDownloadingPreview] = useState<boolean>(false);
  const previewDocumentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPreviewPdf = async () => {
    if (!previewDocumentRef.current) return;
    setIsDownloadingPreview(true);
    try {
      const safeNumber = (invoiceNumber || 'draft').replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportElementToPdf(previewDocumentRef.current, {
        filename: `Invoice-${safeNumber}.pdf`,
        pageSize
      });
    } catch (err: any) {
      console.error('Failed to download preview PDF:', err);
    } finally {
      setIsDownloadingPreview(false);
    }
  };

  // Close full preview on Escape key press
  useEffect(() => {
    if (!showPreviewModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPreviewModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreviewModal]);

  // Client Selection State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isNewClient, setIsNewClient] = useState<boolean>(clients.length === 0);
  const [clientForm, setClientForm] = useState({
    name: '',
    company_name: '',
    email: '',
    billing_address: '',
    phone: '',
    save_client: true
  });

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [currency, setCurrency] = useState<string>(profile.default_currency || 'USD');
  const [purchaseOrder, setPurchaseOrder] = useState<string>('');
  const [template, setTemplate] = useState<'fauget' | 'studio'>(profile.selected_template || 'fauget');

  // Line items (default clean and empty)
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([
    {
      item_type: 'fixed',
      description: '',
      rate: 0,
      quantity: 1,
      total: 0
    }
  ]);

  // Adjustments
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [enableTax, setEnableTax] = useState<boolean>(profile.default_tax_rate > 0);
  const [taxName, setTaxName] = useState<string>(profile.default_tax_name || 'Tax');
  const [taxRate, setTaxRate] = useState<number>(profile.default_tax_rate || 0);

  // Notes and Terms
  const [notes, setNotes] = useState<string>(profile.default_notes || '');
  const [terms, setTerms] = useState<string>(profile.default_payment_terms || '');

  // Reset / Clear Form Handler
  const handleClearForm = () => {
    if (window.confirm('Reset this invoice form to blank? All fields and line items will be cleared.')) {
      setSelectedClientId('');
      setIsNewClient(true);
      setClientForm({
        name: '',
        company_name: '',
        email: '',
        billing_address: '',
        phone: '',
        save_client: false
      });
      setProjectName('');
      setDescription('');
      setPurchaseOrder('');
      setDiscountType('none');
      setDiscountValue(0);
      setNotes(profile.default_notes || '');
      setTerms(profile.default_payment_terms || '');
      setItems([
        {
          item_type: 'fixed',
          description: '',
          rate: 0,
          quantity: 1,
          total: 0
        }
      ]);
    }
  };

  // Auto calculate due date based on payment terms
  useEffect(() => {
    if (!invoiceId && profile.default_payment_terms) {
      const today = new Date();
      let days = 14;
      if (profile.default_payment_terms.includes('30')) days = 30;
      else if (profile.default_payment_terms.includes('7')) days = 7;
      else if (profile.default_payment_terms.includes('60')) days = 60;
      else if (profile.default_payment_terms.toLowerCase().includes('receipt')) days = 0;

      today.setDate(today.getDate() + days);
      setDueDate(today.toISOString().split('T')[0]);
    }
  }, [profile.default_payment_terms, invoiceId]);

  // Auto generate invoice number on mount
  useEffect(() => {
    if (!invoiceId) {
      const prefix = profile.invoice_prefix || 'INV-';
      const num = profile.next_invoice_number || 1001;
      setInvoiceNumber(`${prefix}${String(num).padStart(4, '0')}`);
    }
  }, [profile.invoice_prefix, profile.next_invoice_number, invoiceId]);

  // Load existing invoice if editing
  useEffect(() => {
    if (invoiceId) {
      setIsLoading(true);
      fetch(`/api/invoices/${invoiceId}`)
        .then(res => res.json())
        .then(inv => {
          setInvoiceNumber(inv.invoice_number);
          setInvoiceDate(inv.invoice_date);
          setDueDate(inv.due_date || '');
          setProjectName(inv.project_name || '');
          setDescription(inv.description || '');
          setCurrency(inv.currency);
          setPurchaseOrder(inv.purchase_order || '');
          setTemplate(inv.template || 'fauget');
          setDiscountType(inv.discount_type || 'none');
          setDiscountValue(inv.discount_value || 0);
          setEnableTax(inv.tax_rate > 0);
          setTaxName(inv.tax_name || 'Tax');
          setTaxRate(inv.tax_rate || 0);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');

          if (inv.client_id) {
            setSelectedClientId(inv.client_id);
            setIsNewClient(false);
          } else if (inv.client_snapshot) {
            setIsNewClient(true);
            setClientForm({
              name: inv.client_snapshot.name || '',
              company_name: inv.client_snapshot.company_name || '',
              email: inv.client_snapshot.email || '',
              billing_address: inv.client_snapshot.billing_address || '',
              phone: inv.client_snapshot.phone || '',
              save_client: false
            });
          }

          if (inv.items && inv.items.length > 0) {
            setItems(inv.items);
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [invoiceId]);

  // Handle client selection change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'NEW') {
      setIsNewClient(true);
      setClientForm({ name: '', company_name: '', email: '', billing_address: '', phone: '', save_client: true });
    } else {
      setIsNewClient(false);
      const found = clients.find(c => c.id === clientId);
      if (found) {
        setClientForm({
          name: found.name,
          company_name: found.company_name || '',
          email: found.email || '',
          billing_address: found.billing_address || '',
          phone: found.phone || '',
          save_client: false
        });
      }
    }
  };

  // Line Items Handlers
  const handleAddItem = (type: 'fixed' | 'hourly' = 'fixed') => {
    const newItem: Partial<InvoiceItem> = type === 'hourly'
      ? { item_type: 'hourly', description: '', project: projectName, rate: 25, hours: 1, minutes: 0, total: 25 }
      : { item_type: 'fixed', description: '', project: projectName, rate: 100, quantity: 1, total: 100 };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const updated = [...items];
    const target = { ...updated[index], ...updates };
    target.total = calculateItemTotal(target);
    updated[index] = target;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('An invoice must have at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Real-time calculations
  const totals = calculateInvoiceTotals(
    items,
    { type: discountType, value: discountValue },
    { rate: enableTax ? taxRate : 0, name: taxName },
    0
  );

  // Active client object for live preview
  const activeClient = isNewClient 
    ? { id: 'temp', ...clientForm } 
    : (clients.find(c => c.id === selectedClientId) || { id: 'temp', ...clientForm });

  // Preview invoice object
  const previewInvoice: Partial<Invoice> = {
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: dueDate,
    project_name: projectName,
    description,
    currency,
    purchase_order: purchaseOrder,
    subtotal: totals.subtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: totals.discountAmount,
    tax_name: taxName,
    tax_rate: enableTax ? taxRate : 0,
    tax_amount: totals.taxAmount,
    total_due: totals.totalDue,
    amount_paid: 0,
    balance_due: totals.totalDue,
    notes,
    terms,
    template,
    items: totals.calculatedItems as InvoiceItem[],
    client_snapshot: activeClient
  };

  const handleSave = async (status: 'draft' | 'sent' = 'sent') => {
    setError(null);

    // Validation
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }

    if (isNewClient && !clientForm.name.trim()) {
      setError('Please provide a client name.');
      return;
    } else if (!isNewClient && !selectedClientId) {
      setError('Please select a client or enter a new client.');
      return;
    }

    if (items.length === 0 || !items.some(i => i.description && i.description.trim())) {
      setError('Please add at least one line item with a description.');
      return;
    }

    setIsLoading(true);

    const payload = {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      client_id: isNewClient ? null : selectedClientId,
      client_data: isNewClient ? clientForm : null,
      project_name: projectName,
      description,
      currency,
      purchase_order: purchaseOrder,
      items: totals.calculatedItems,
      discount: { type: discountType, value: Number(discountValue) || 0 },
      tax: { rate: enableTax ? Number(taxRate) || 0 : 0, name: taxName },
      notes,
      terms,
      template,
      status
    };

    try {
      const endpoint = invoiceId ? `/api/invoices/${invoiceId}` : '/api/invoices';
      const method = invoiceId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save invoice');
      }

      const saved = await res.json();
      onSaveSuccess(saved.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {invoiceId ? `Edit Invoice ${invoiceNumber}` : 'New Invoice'}
            </h2>
            <p className="text-xs text-slate-500">
              {isNewClient ? (clientForm.name || 'New Client') : (activeClient?.name || 'Selected Client')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handleClearForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 rounded-xl text-sm font-semibold transition"
            title="Reset all entered values and start fresh"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Form</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <Eye className="w-4 h-4" />
            <span>Full Preview</span>
          </button>

          <button
            onClick={() => handleSave('draft')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSave('sent')}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <FileCheck2 className="w-4 h-4 stroke-[2.5]" />
            <span>{isLoading ? 'Saving...' : 'Save & Issue Invoice'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Dismiss</button>
        </div>
      )}

      {/* Editor & Live Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Client Information */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Client Information</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleClientSelect(clients.length > 0 && !isNewClient ? 'NEW' : (clients[0]?.id || 'NEW'))}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  {isNewClient && clients.length > 0 ? '← Choose Existing Client' : '+ Add New Client'}
                </button>
              </div>
            </div>

            {!isNewClient && clients.length > 0 ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="">-- Choose a saved client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                  <option value="NEW">+ Enter a new client</option>
                </select>

                {activeClient && activeClient.name && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-100">
                    <div className="font-bold text-slate-800">{activeClient.name}</div>
                    {activeClient.company_name && <div>{activeClient.company_name}</div>}
                    {activeClient.email && <div>{activeClient.email}</div>}
                    {activeClient.billing_address && <div className="whitespace-pre-line text-slate-500">{activeClient.billing_address}</div>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Madison Carter"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Carter & Co. Marketing"
                      value={clientForm.company_name}
                      onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="875 Westbrook Drive, Austin, TX 78702"
                    value={clientForm.billing_address}
                    onChange={(e) => setClientForm({ ...clientForm, billing_address: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={clientForm.save_client}
                    onChange={(e) => setClientForm({ ...clientForm, save_client: e.target.checked })}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">Save client to directory for future invoices</span>
                </label>
              </div>
            )}
          </div>

          {/* Card 2: Invoice Metadata */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100">
              Invoice Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (CA$)</option>
                  <option value="AUD">AUD (AU$)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (CHF)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Website updates & Brand Design"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PO / Reference # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO-88219"
                  value={purchaseOrder}
                  onChange={(e) => setPurchaseOrder(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Line Items (Fixed & Hourly) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Line Items</h3>
                <p className="text-xs text-slate-400">Supports Fixed-Price and Hourly billing modes</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem('fixed')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Fixed Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('hourly')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold transition"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  <span>+ Hourly Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const isHourly = item.item_type === 'hourly';
                return (
                  <div key={index} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 relative group">
                    <div className="flex justify-between items-center">
                      {/* Pricing Mode Toggle Pill */}
                      <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(index, { item_type: 'fixed', quantity: 1 })}
                          className={`px-3 py-1 rounded-md transition ${
                            !isHourly ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          Fixed Price
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(index, { item_type: 'hourly', hours: item.hours || 1, minutes: item.minutes || 0 })}
                          className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                            isHourly ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Hourly</span>
                        </button>
                      </div>

                      {/* Line Item Total & Delete */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(item.total, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description & Project */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          placeholder="Description of service (e.g. Website updates & maintenance)"
                          value={item.description || ''}
                          onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Project tag (optional)"
                          value={item.project || ''}
                          onChange={(e) => handleUpdateItem(index, { project: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600"
                        />
                      </div>
                    </div>

                    {/* Numeric Inputs */}
                    {isHourly ? (
                      <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Hourly Rate ($/h)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="20"
                            value={item.rate || ''}
                            onChange={(e) => handleUpdateItem(index, { rate: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="6"
                            value={item.hours !== undefined ? item.hours : ''}
                            onChange={(e) => handleUpdateItem(index, { hours: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Minutes (0-59)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="28"
                            value={item.minutes !== undefined ? item.minutes : ''}
                            onChange={(e) => handleUpdateItem(index, { minutes: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Amount / Price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="175.00"
                            value={item.rate || ''}
                            onChange={(e) => handleUpdateItem(index, { rate: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="1"
                            value={item.quantity !== undefined ? item.quantity : 1}
                            onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Discounts, Taxes, and Notes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100">
              Discounts, Taxes & Notes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discount Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">Discount</span>
                  <div className="flex gap-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('none')}
                      className={`px-2 py-0.5 rounded ${discountType === 'none' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2 py-0.5 rounded ${discountType === 'percentage' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2 py-0.5 rounded ${discountType === 'fixed' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500'}`}
                    >
                      $ Fixed
                    </button>
                  </div>
                </div>

                {discountType !== 'none' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="0"
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono"
                      placeholder={discountType === 'percentage' ? '10%' : '50.00'}
                    />
                    <span className="text-xs text-emerald-600 font-bold whitespace-nowrap">
                      -{formatCurrency(totals.discountAmount, currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Tax Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">Tax / VAT</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={enableTax}
                      onChange={(e) => setEnableTax(e.target.checked)}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    />
                    <span>Apply</span>
                  </label>
                </div>

                {enableTax && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Tax Name (VAT)"
                      value={taxName}
                      onChange={(e) => setTaxName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Rate %"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono"
                      />
                      <span className="absolute right-2.5 top-2 text-xs text-slate-400">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Notes (Displays on document)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment notes, thank you message, or instructions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g. Net 14 days. 1.5% late fee per month."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Template Switcher & Live Mini Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Summary Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100 flex justify-between items-center">
              <span>Financial Summary</span>
              <span className="text-xs font-mono font-medium text-slate-400">{currency}</span>
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(totals.subtotal, currency)}</span>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">-{formatCurrency(totals.discountAmount, currency)}</span>
                </div>
              )}

              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{taxName} ({taxRate}%)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatCurrency(totals.taxAmount, currency)}</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-slate-100 flex justify-between items-center">
                <span className="text-base font-extrabold text-slate-900">Total Due</span>
                <span className="text-2xl font-black font-mono text-teal-800">
                  {formatCurrency(totals.totalDue, currency)}
                </span>
              </div>
            </div>

            {/* Template Selector */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Document Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate('fauget')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                    template === 'fauget' 
                      ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900">Executive Elegance</span>
                  <span className="text-[10px] text-slate-500">Ref 1: Fauget Sand/Teal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('studio')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                    template === 'studio' 
                      ? 'border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-500/20' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${template === 'studio' ? 'text-white' : 'text-slate-900'}`}>Modern Studio</span>
                  <span className={`text-[10px] ${template === 'studio' ? 'text-zinc-400' : 'text-slate-500'}`}>Ref 2: Dark & Neon</span>
                </button>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSave('sent')}
                disabled={isLoading}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save & Issue Invoice'}
              </button>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={isLoading}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition"
              >
                Save as Draft
              </button>
            </div>
          </div>

          {/* Mini Live Preview Container */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-teal-700" />
                <span>Live Scaled Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="text-xs font-bold text-teal-700 hover:underline"
              >
                Expand
              </button>
            </div>

            {/* Scaled Preview Frame */}
            <div className="w-full bg-slate-200/70 p-3 rounded-xl overflow-hidden flex justify-center items-center">
              <div className="transform scale-[0.48] sm:scale-[0.55] origin-top -mb-[420px] pointer-events-none select-none">
                <InvoiceDocument
                  invoice={previewInvoice}
                  profile={profile}
                  client={activeClient}
                  pageSize={pageSize}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreviewModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreviewModal(false);
          }}
        >
          {/* Floating Fixed Close Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(false)}
            className="fixed top-4 right-4 z-[60] p-3 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full shadow-2xl backdrop-blur-md border border-slate-700/80 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            title="Close preview (Esc)"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-slate-300 group-hover:text-white" />
          </button>

          <div className="max-w-4xl mx-auto my-2 sm:my-6 relative shadow-2xl">
            {/* Modal Toolbar (Sticky) */}
            <div className="sticky top-0 z-30 bg-slate-900 text-white px-5 sm:px-6 py-3.5 rounded-t-2xl flex justify-between items-center flex-wrap gap-3 shadow-md border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm tracking-wide">Live Document Preview</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-teal-300 font-mono">
                  {template === 'fauget' ? 'Executive (Ref 1)' : 'Studio (Ref 2)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Page Size toggle */}
                <div className="bg-slate-800 p-0.5 rounded-lg text-xs font-semibold flex">
                  <button
                    type="button"
                    onClick={() => setPageSize('A4')}
                    className={`px-2.5 py-1 rounded ${pageSize === 'A4' ? 'bg-teal-700 text-white' : 'text-slate-400'}`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('Letter')}
                    className={`px-2.5 py-1 rounded ${pageSize === 'Letter' ? 'bg-teal-700 text-white' : 'text-slate-400'}`}
                  >
                    Letter
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPreviewPdf}
                  disabled={isDownloadingPreview}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs disabled:opacity-75 disabled:cursor-wait"
                  title="Download PDF directly to your device"
                >
                  {isDownloadingPreview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Close Preview</span>
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="bg-slate-200/90 p-4 sm:p-10 overflow-x-auto flex justify-center">
              <div ref={previewDocumentRef} className="shadow-2xl">
                <InvoiceDocument
                  invoice={previewInvoice}
                  profile={profile}
                  client={activeClient}
                  pageSize={pageSize}
                />
              </div>
            </div>

            {/* Modal Footer with Dismiss Action */}
            <div className="bg-slate-900 text-slate-300 px-6 py-3 rounded-b-2xl flex justify-between items-center text-xs border-t border-slate-800">
              <span className="text-slate-400">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[11px] border border-slate-700">Esc</kbd> or click outside to exit
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition text-xs cursor-pointer"
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
