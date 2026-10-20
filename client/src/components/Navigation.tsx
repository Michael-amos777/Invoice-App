import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Receipt,
  Sparkles,
  Download,
  RotateCcw
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { InstallModal } from './InstallModal';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  profile: BusinessProfile | null;
  onNewInvoice: () => void;
  onQuickReset?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  profile,
  onNewInvoice,
  onQuickReset
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    } else {
      setIsInstallModalOpen(true);
    }
  };
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'settings', label: 'Business Profile & Settings', icon: Settings }
  ];

  const primaryColor = profile?.primary_color || '#0E6973';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-8">
            <div 
              onClick={() => setCurrentTab('dashboard')} 
              className="flex items-center gap-3 cursor-pointer group"
            >
              {profile?.logo_url ? (
                <img 
                  src={profile.logo_url} 
                  alt="Brand Logo" 
                  className="w-9 h-9 object-contain rounded-xl shadow-sm border border-slate-100" 
                />
              ) : (
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm transition group-hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(profile?.business_name || 'Invoicr').substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 tracking-tight text-base group-hover:text-teal-700 transition">
                  {profile?.business_name || 'Invoicr Pro'}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                  Invoice Suite
                </span>
              </div>
            </div>

            {/* Navigation links for Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-xs sm:text-sm font-semibold transition active:scale-95"
                title="Install Invoicr Pro as an app on your phone or PC"
              >
                <Download className="w-4 h-4 text-teal-700" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            <button
              onClick={onNewInvoice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:shadow transition transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50/80 px-2 py-1.5 flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* PWA Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstallNative={deferredPrompt ? handleInstallClick : undefined}
        canInstallNative={!!deferredPrompt}
      />
    </header>
  );
};
