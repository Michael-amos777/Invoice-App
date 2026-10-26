import React from 'react';
import { 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  Plus, 
  Download, 
  ExternalLink,
  Sparkles,
  Building2,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { DashboardStats, BusinessProfile, Invoice } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/calculations';

interface DashboardProps {
  stats: DashboardStats | null;
  profile: BusinessProfile | null;
  onNewInvoice: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  profile,
  onNewInvoice,
  onViewInvoice,
  onNavigate
}) => {
  const currency = profile?.default_currency || 'USD';
  const primaryColor = profile?.primary_color || '#0E6973';

  const cards = [
    {
      title: 'Total Invoiced',
      value: formatCurrency(stats?.totalInvoiced || 0, currency),
      subtitle: `${stats?.totalInvoices || 0} invoices issued`,
      icon: DollarSign,
      color: 'bg-teal-50 text-teal-700 border-teal-100'
    },
    {
      title: 'Total Received',
      value: formatCurrency(stats?.totalPaid || 0, currency),
      subtitle: 'Recorded payments',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(stats?.totalOutstanding || 0, currency),
      subtitle: 'Awaiting settlement',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700 border-amber-100'
    },
    {
      title: 'Total Invoices',
      value: String(stats?.totalInvoices || 0),
      subtitle: 'Across all clients',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-100'
    }
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
      sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
      partially_paid: { label: 'Partially Paid', bg: 'bg-amber-50', text: 'text-amber-700' },
      paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      overdue: { label: 'Overdue', bg: 'bg-rose-50', text: 'text-rose-700' },
      cancelled: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-500' }
    };

    const c = config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold backdrop-blur-sm mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready to bill clients</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.owner_name || profile?.business_name || 'Creator'}
          </h1>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Create professional invoices in seconds with saved branding, client auto-fill, precision hourly time calculations, and instant Edge vector PDF export.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onNewInvoice}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-sm shadow hover:bg-slate-100 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Invoice</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm backdrop-blur-sm transition"
            >
              <Building2 className="w-4 h-4" />
              <span>Customize Business & Logo</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div 
          className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Demo Data Notice Banner */}
      {(profile?.business_name === 'Acme Creative Studio' || (stats?.totalInvoices || 0) > 0) && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </span>
            <div>
              <strong className="font-bold">Need a clean slate?</strong>
              <span className="text-amber-800/90 ml-1">You can reset all default figures, sample names, and invoices anytime in Settings.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('settings')}
              className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-200 text-amber-950 font-bold rounded-xl transition"
            >
              Reset Data in Settings →
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.title}</span>
                <div className={`p-2 rounded-xl border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{c.value}</div>
                <div className="text-xs text-slate-400 mt-1">{c.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown Bar */}
      {stats?.statusBreakdown && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Invoice Status Distribution</span>
            <span className="text-xs text-slate-400">Real-time status overview</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { status: 'draft', label: 'Drafts', count: stats.statusBreakdown.draft, bg: 'bg-slate-50 border-slate-200' },
              { status: 'sent', label: 'Sent', count: stats.statusBreakdown.sent, bg: 'bg-blue-50/60 border-blue-100' },
              { status: 'partially_paid', label: 'Partially Paid', count: stats.statusBreakdown.partially_paid, bg: 'bg-amber-50/60 border-amber-100' },
              { status: 'paid', label: 'Paid', count: stats.statusBreakdown.paid, bg: 'bg-emerald-50/60 border-emerald-100' },
              { status: 'overdue', label: 'Overdue', count: stats.statusBreakdown.overdue, bg: 'bg-rose-50/60 border-rose-100' },
              { status: 'cancelled', label: 'Cancelled', count: stats.statusBreakdown.cancelled, bg: 'bg-slate-50 border-slate-200' }
            ].map(item => (
              <div key={item.status} className={`p-3 rounded-xl border ${item.bg}`}>
                <div className="text-xs font-medium text-slate-600">{item.label}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">Latest billing activity</p>
          </div>
          <button
            onClick={() => onNavigate('invoices')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 transition"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Invoice #</th>
                <th className="py-3 px-6">Client</th>
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-6 text-right">Amount</th>
                <th className="py-3 px-6 text-right">Balance</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                stats.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {inv.client_snapshot?.name || 'Client'}
                      </div>
                      {inv.client_snapshot?.company_name && (
                        <div className="text-xs text-slate-400">{inv.client_snapshot.company_name}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {formatDisplayDate(inv.invoice_date)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(inv.total_due, inv.currency)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs">
                      {Number(inv.balance_due) > 0 ? (
                        <span className="text-amber-700 font-semibold">{formatCurrency(inv.balance_due, inv.currency)}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Paid</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                        >
                          View
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          download={`Invoice-${(inv.invoice_number || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No invoices created yet.</p>
                    <button
                      onClick={onNewInvoice}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create your first invoice
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
