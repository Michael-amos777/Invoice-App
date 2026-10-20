import React, { useState } from 'react';
import { Client, BusinessProfile } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/calculations';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  DollarSign, 
  Edit3, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

interface ClientsListProps {
  clients: Client[];
  profile: BusinessProfile | null;
  onRefresh: () => void;
  onNewInvoiceForClient: (clientId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({
  clients,
  profile,
  onRefresh,
  onNewInvoiceForClient,
  onViewInvoice
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currency = profile?.default_currency || 'USD';

  // Filter clients
  const filtered = clients.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingClient({
      name: '',
      company_name: '',
      email: '',
      billing_address: '',
      phone: '',
      notes: ''
    });
    setError(null);
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setError(null);
    setIsEditingModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient.name?.trim()) {
      setError('Client name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const isUpdate = Boolean(editingClient.id);
      const endpoint = isUpdate ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save client');
      }

      setIsEditingModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error saving client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete client');
      if (selectedClientDetails?.id === id) {
        setSelectedClientDetails(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewClientInvoices = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error('Failed to fetch client history');
      const data = await res.json();
      setSelectedClientDetails(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Client Directory</h1>
          <p className="text-xs text-slate-500">Manage client contacts and view their billing histories</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(client => (
          <div 
            key={client.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 font-extrabold flex items-center justify-center text-sm border border-teal-100">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{client.name}</h3>
                    {client.company_name && (
                      <p className="text-xs text-slate-500 font-medium">{client.company_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(client)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Client"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact information */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-2 border-t border-slate-100">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.billing_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2 text-slate-500">{client.billing_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial summary for this client */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">Total Billed</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {formatCurrency(client.total_billed || 0, currency)}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">Outstanding</div>
                  <div className="font-mono font-bold text-amber-700 mt-0.5">
                    {formatCurrency(client.balance_due || 0, currency)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewClientInvoices(client.id)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Invoices ({client.total_invoices || 0})</span>
                </button>
                <button
                  onClick={() => onNewInvoiceForClient(client.id)}
                  className="py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  title="Create Invoice for Client"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bill</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 bg-white rounded-2xl border border-slate-200/80 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <h3 className="font-bold text-slate-900 text-base">No clients found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Add your clients once to speed up invoice creation.</p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Client</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingClient.id ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Howard Ong"
                    value={editingClient.name || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Fauget Adventures"
                    value={editingClient.company_name || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, company_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@fauget.com"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 012-3456"
                    value={editingClient.phone || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="123 Anywhere St., Any City"
                  value={editingClient.billing_address || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, billing_address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. VIP client, preferred payment ACH"
                  value={editingClient.notes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client History Details Drawer / Modal */}
      {selectedClientDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedClientDetails.name}</h3>
                <p className="text-xs text-slate-500">{selectedClientDetails.company_name || 'Client Invoices'}</p>
              </div>
              <button
                onClick={() => setSelectedClientDetails(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Associated Invoices</h4>
                <button
                  onClick={() => {
                    const cid = selectedClientDetails.id;
                    setSelectedClientDetails(null);
                    onNewInvoiceForClient(cid);
                  }}
                  className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Invoice for this client</span>
                </button>
              </div>

              {selectedClientDetails.invoices && selectedClientDetails.invoices.length > 0 ? (
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {selectedClientDetails.invoices.map(inv => (
                    <div key={inv.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition">
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-sm">{inv.invoice_number}</div>
                        <div className="text-xs text-slate-400">{formatDisplayDate(inv.invoice_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(inv.total_due, inv.currency)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Balance: {formatCurrency(inv.balance_due, inv.currency)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedClientDetails(null);
                          onViewInvoice(inv.id);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold ml-4"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">No invoices generated for this client yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
