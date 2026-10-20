import React, { useState, useEffect } from 'react';
import { BusinessProfile, Client, DashboardStats, Invoice } from './types';
import { api } from './api';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceViewer } from './components/InvoiceViewer';
import { ClientsList } from './components/ClientsList';
import { ProfileSettings } from './components/ProfileSettings';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [profData, clientsData, invoicesData, statsData] = await Promise.all([
        api.getProfile(),
        api.getClients(),
        api.getInvoices(),
        api.getDashboardStats()
      ]);

      setProfile(profData);
      setClients(clientsData);
      setInvoices(invoicesData);
      setDashboardStats(statsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError(err.message || 'Error connecting to invoice server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRefresh = async () => {
    try {
      const [clientsData, invoicesData, statsData, profData] = await Promise.all([
        api.getClients(),
        api.getInvoices(),
        api.getDashboardStats(),
        api.getProfile()
      ]);
      setClients(clientsData);
      setInvoices(invoicesData);
      setDashboardStats(statsData);
      setProfile(profData);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleNewInvoice = () => {
    setEditingInvoiceId(null);
    setActiveInvoiceId(null);
    setCurrentTab('new_invoice');
  };

  const handleEditInvoice = (id: string) => {
    setEditingInvoiceId(id);
    setActiveInvoiceId(null);
    setCurrentTab('edit_invoice');
  };

  const handleViewInvoice = (id: string) => {
    setActiveInvoiceId(id);
    setCurrentTab('view_invoice');
  };

  const handleSaveSuccess = (savedInvoiceId: string) => {
    handleRefresh();
    setActiveInvoiceId(savedInvoiceId);
    setCurrentTab('view_invoice');
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-slate-900 font-extrabold text-lg">Invoicr Pro</h2>
        <p className="text-slate-500 text-xs mt-1">Starting professional invoice workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation bar */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setActiveInvoiceId(null);
          setEditingInvoiceId(null);
          setCurrentTab(tab);
        }}
        profile={profile}
        onNewInvoice={handleNewInvoice}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={loadInitialData}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Route Switching */}
        {currentTab === 'dashboard' && (
          <Dashboard
            stats={dashboardStats}
            profile={profile}
            onNewInvoice={handleNewInvoice}
            onViewInvoice={handleViewInvoice}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            profile={profile}
            clients={clients}
            onNewInvoice={handleNewInvoice}
            onEditInvoice={handleEditInvoice}
            onViewInvoice={handleViewInvoice}
            onRefresh={handleRefresh}
          />
        )}

        {(currentTab === 'new_invoice' || currentTab === 'edit_invoice') && profile && (
          <InvoiceEditor
            invoiceId={editingInvoiceId}
            profile={profile}
            clients={clients}
            onSaveSuccess={handleSaveSuccess}
            onCancel={() => setCurrentTab('invoices')}
          />
        )}

        {currentTab === 'view_invoice' && activeInvoiceId && profile && (
          <InvoiceViewer
            invoiceId={activeInvoiceId}
            profile={profile}
            onBack={() => setCurrentTab('invoices')}
            onEdit={handleEditInvoice}
            onRefresh={handleRefresh}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsList
            clients={clients}
            profile={profile}
            onRefresh={handleRefresh}
            onNewInvoiceForClient={(clientId) => {
              handleNewInvoice();
            }}
            onViewInvoice={handleViewInvoice}
          />
        )}

        {currentTab === 'settings' && profile && (
          <ProfileSettings
            profile={profile}
            onProfileUpdated={(updated) => {
              setProfile(updated);
              handleRefresh();
            }}
            onResetWorkspace={handleRefresh}
          />
        )}
      </main>
    </div>
  );
}

export default App;
