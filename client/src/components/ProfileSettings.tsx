import React, { useState, useRef } from 'react';
import { BusinessProfile } from '../types';
import { api } from '../api';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Check, 
  Palette, 
  CreditCard, 
  FileText, 
  Globe, 
  Share2, 
  Save, 
  Sparkles,
  Layers,
  RotateCcw,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface ProfileSettingsProps {
  profile: BusinessProfile;
  onProfileUpdated: (updated: BusinessProfile) => void;
  onResetWorkspace?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onProfileUpdated,
  onResetWorkspace
}) => {
  const [formData, setFormData] = useState<BusinessProfile>(profile);
  const [socialLinks, setSocialLinks] = useState<any>(() => {
    if (typeof profile.social_links === 'object') return profile.social_links;
    try {
      return JSON.parse(profile.social_links || '{}');
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'banking' | 'defaults' | 'reset'>('general');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetStatusMsg, setResetStatusMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const uploadData = new FormData();
    uploadData.append('logo', file);

    try {
      const res = await fetch('/api/profile/logo', {
        method: 'POST',
        body: uploadData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload logo');
      }
      const data = await res.json();
      setFormData(prev => ({ ...prev, logo_url: data.logo_url }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await fetch('/api/profile/logo', { method: 'DELETE' });
      setFormData(prev => ({ ...prev, logo_url: null }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        ...formData,
        social_links: socialLinks
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      const updated = await res.json();
      setFormData(updated);
      onProfileUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (mode: 'all' | 'data_only' | 'seed') => {
    let confirmPrompt = '';
    if (mode === 'all') {
      confirmPrompt = '⚠️ DANGER: This will wipe all invoices, items, clients, and reset all default business figures & names back to a blank clean slate.\n\nAre you sure you want to completely reset?';
    } else if (mode === 'data_only') {
      confirmPrompt = 'This will delete all saved invoices and client records, but keep your business profile intact.\n\nProceed?';
    } else if (mode === 'seed') {
      confirmPrompt = 'This will reload sample demo invoices and client data for testing.\n\nProceed?';
    }

    if (!window.confirm(confirmPrompt)) return;

    setIsResetting(true);
    setError(null);
    setResetStatusMsg(null);

    try {
      const res = await api.resetWorkspace(mode);
      setResetStatusMsg(res.message);
      const refreshedProfile = await api.getProfile();
      setFormData(refreshedProfile);
      onProfileUpdated(refreshedProfile);
      if (onResetWorkspace) {
        onResetWorkspace();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute reset operation.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Profile & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set up once. Details and brand styling will auto-populate across all future invoices.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Profile and settings saved successfully. Previous invoices keep their original historical snapshots.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl">
          {error}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-2 rounded-2xl shadow-xs">
        {[
          { id: 'general', label: 'Business & Contact', icon: Building2 },
          { id: 'branding', label: 'Logo & Brand Colors', icon: Palette },
          { id: 'banking', label: 'Banking & Payment Details', icon: CreditCard },
          { id: 'defaults', label: 'Invoice Defaults & Terms', icon: FileText },
          { id: 'reset', label: 'Data & Reset', icon: RotateCcw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: General Business Details */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Business & Contact Information</h3>
              <p className="text-xs text-slate-400">These details will be displayed as the issuer on your invoices.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business / Trading Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fauget Adventures"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Howard Ong"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email Address</label>
                <input
                  type="email"
                  placeholder="hello@reallygreatsite.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="123-456-7890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                <input
                  type="text"
                  placeholder="https://reallygreatsite.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical / Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="123 Anywhere St., Any City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Social Media Links (Optional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/username"
                    value={socialLinks.linkedin || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Instagram</label>
                  <input
                    type="text"
                    placeholder="@handle"
                    value={socialLinks.instagram || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">X / Twitter</label>
                  <input
                    type="text"
                    placeholder="@twitterhandle"
                    value={socialLinks.twitter || ''}
                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Branding & Design */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Branding & Visual Direction</h3>
              <p className="text-xs text-slate-400">Configure your business logo, custom color palette, and document typography.</p>
            </div>

            {/* Logo Upload Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {formData.logo_url ? (
                  <div className="relative group">
                    <img
                      src={formData.logo_url}
                      alt="Uploaded Logo"
                      className="w-20 h-20 object-contain rounded-2xl bg-white p-2 border border-slate-200 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md"
                    style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}
                  >
                    {(formData.business_name || 'I').substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Business Logo</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Supports PNG, JPG, SVG, and WebP up to 5MB.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Displayed crisply on all PDF documents and live previews.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.logo_url ? 'Replace Logo' : 'Upload Logo'}</span>
                </button>
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
                  >
                    Remove
                  </button>
                )}
              </div>

              {formData.logo_url && (
                <div className="pt-3 border-t border-slate-100 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="show_name_with_logo"
                    checked={formData.show_name_with_logo !== false && formData.show_name_with_logo !== 0}
                    onChange={(e) => setFormData({ ...formData, show_name_with_logo: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 mt-0.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="show_name_with_logo" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Show business name text next to logo
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Uncheck this if your uploaded logo already contains your business name.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color || '#0E6973'}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.primary_color || '#0E6973'}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm uppercase font-bold text-slate-800 w-32"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Used for invoice table headers, badges, and accents.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Secondary Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.secondary_color || '#208B99'}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color || '#208B99'}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm uppercase font-bold text-slate-800 w-32"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Used for gradient arcs and subtle decorative highlights.</p>
              </div>
            </div>

            {/* Typography Selection */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Font
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta', preview: 'Modern & Clean' },
                  { id: 'Inter', label: 'Inter', preview: 'Standard & Tech' },
                  { id: 'Montserrat', label: 'Montserrat', preview: 'Bold & Geometric' },
                  { id: 'Space Grotesk', label: 'Space Grotesk', preview: 'Futuristic Studio' }
                ].map(font => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, preferred_font: font.id })}
                    className={`p-3 rounded-xl border text-left transition ${
                      formData.preferred_font === font.id 
                        ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-500/20' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs" style={{ fontFamily: font.id }}>
                      {font.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{font.preview}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Default Signature Template */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Default Invoice Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selected_template: 'fauget' })}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                    formData.selected_template === 'fauget' 
                      ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-500/20' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    Ref 1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Executive Elegance (Fauget)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Warm linen background, organic teal gradient arcs, rounded white cards, and floating dark pill footer.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selected_template: 'studio' })}
                  className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                    formData.selected_template === 'studio' 
                      ? 'border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-500/20' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00FF41] text-black flex items-center justify-center font-bold text-xs shrink-0">
                    Ref 2
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${formData.selected_template === 'studio' ? 'text-white' : 'text-slate-900'}`}>
                      Modern Studio (Flux Studio)
                    </div>
                    <div className={`text-xs mt-0.5 ${formData.selected_template === 'studio' ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Pitch black canvas, high-contrast neon green accent badges, and bold brutalist studio aesthetics.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Banking & Payment Information */}
        {activeTab === 'banking' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Banking & Remittance Information</h3>
              <p className="text-xs text-slate-400">
                Printed in the "BANK DETAILS" section of your invoices so clients know exactly how to pay you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Salford & Co. or Chase Commercial"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Creative Studio LLC"
                  value={formData.bank_account_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="0123 4567 8901 2345"
                  value={formData.bank_account_number || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={formData.bank_account_type || 'Checking'}
                  onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="Checking">Checking / Current</option>
                  <option value="Savings">Savings</option>
                  <option value="Corporate">Corporate / Business</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Routing Number / Sort Code</label>
                <input
                  type="text"
                  placeholder="122105155 or 40-00-00"
                  value={formData.bank_routing_number || ''}
                  onChange={(e) => setFormData({ ...formData, bank_routing_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IBAN (International)</label>
                <input
                  type="text"
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                  value={formData.bank_iban || ''}
                  onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SWIFT / BIC Code</label>
                <input
                  type="text"
                  placeholder="NWBKGB2L"
                  value={formData.bank_swift_bic || ''}
                  onChange={(e) => setFormData({ ...formData, bank_swift_bic: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm uppercase focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Other Payment Methods & Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Wire transfer, ACH, Stripe link: https://buy.stripe.com/..., PayPal: billing@..., or Venmo: @acme"
                value={formData.other_payment_methods || ''}
                onChange={(e) => setFormData({ ...formData, other_payment_methods: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>
        )}

        {/* TAB 4: Invoice Defaults */}
        {activeTab === 'defaults' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Invoice Defaults & Sequential Numbering</h3>
              <p className="text-xs text-slate-400">Settings applied automatically each time you create a new invoice.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  placeholder="INV-"
                  value={formData.invoice_prefix || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Sequential Number</label>
                <input
                  type="number"
                  min="1"
                  value={formData.next_invoice_number || 1001}
                  onChange={(e) => setFormData({ ...formData, next_invoice_number: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Currency</label>
                <select
                  value={formData.default_currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Payment Terms</label>
                <select
                  value={formData.default_payment_terms || 'Net 14'}
                  onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 7">Net 7 Days</option>
                  <option value="Net 14">Net 14 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Tax Name</label>
                <input
                  type="text"
                  placeholder="Tax, VAT, or GST"
                  value={formData.default_tax_name || 'Tax'}
                  onChange={(e) => setFormData({ ...formData, default_tax_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={formData.default_tax_rate || 0}
                  onChange={(e) => setFormData({ ...formData, default_tax_rate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Invoice Notes</label>
              <textarea
                rows={3}
                placeholder="e.g. We prioritize customer satisfaction. Our team is dedicated to delivering exceptional service and ensuring your safety and enjoyment."
                value={formData.default_notes || ''}
                onChange={(e) => setFormData({ ...formData, default_notes: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>
        )}

        {/* TAB 5: Data Management & Reset */}
        {activeTab === 'reset' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-teal-700" />
                <span>Workspace Data & Reset</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Clear all default figures, dummy names, and sample invoices to start with a fresh slate, or reload demo items anytime.
              </p>
            </div>

            {resetStatusMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetStatusMsg}</span>
              </div>
            )}

            <div className="space-y-4 pt-2">
              {/* Option 1: Full Blank Slate */}
              <div className="p-5 rounded-2xl border-2 border-red-100 bg-red-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800">
                      Clean Slate
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">Reset Workspace to Blank</h4>
                  </div>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    Wipes all sample invoices, clients, payments, and resets default business figures & names (Acme Creative Studio, Alex Morgan, default bank info) so you start fresh with zero placeholder data.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => handleReset('all')}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {isResetting ? 'Resetting...' : 'Reset Everything to Blank'}
                </button>
              </div>

              {/* Option 2: Clear Invoices & Clients Only */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Clear Invoices & Clients Only</h4>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    Deletes all created invoices and client records, but preserves your configured business name, logo, brand colors, and payment settings.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => handleReset('data_only')}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  Clear Invoices Only
                </button>
              </div>

              {/* Option 3: Reload Demo Data */}
              <div className="p-5 rounded-2xl border border-teal-100 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                      Sample Data
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">Reload Demo Invoices & Clients</h4>
                  </div>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    Populates the app with sample invoices (Fauget Ski Package, Flux Studio Branding) and clients to test template styling and PDF export features.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => handleReset('seed')}
                  className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  Load Sample Data
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
