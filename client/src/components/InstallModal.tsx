import React from 'react';
import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle, X } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallNative?: () => void;
  canInstallNative: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  onInstallNative,
  canInstallNative
}) => {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shadow-xs">
            <img src="/icon-192.png" alt="Invoicr Pro" className="w-9 h-9 rounded-xl object-contain" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Install Invoicr Pro</h3>
            <p className="text-xs text-slate-500 font-medium">Use as a standalone native app on phone or PC</p>
          </div>
        </div>

        {canInstallNative ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Click below to install Invoicr Pro directly to your device. It will appear on your desktop or home screen and run in fullscreen windowed mode without browser tabs.
            </p>
            <button
              onClick={() => {
                if (onInstallNative) onInstallNative();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-md transition active:scale-98"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Install Invoicr Pro Now</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-slate-700">
                  Tap the <strong className="font-semibold text-slate-900">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom or top of Safari.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-slate-700">
                  Scroll down the share sheet and tap <strong className="font-semibold text-slate-900">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-slate-700">
                  Tap <strong className="font-semibold text-slate-900">Add</strong> in the top-right corner to launch Invoicr Pro from your home screen.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              To install Invoicr Pro on your device:
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-teal-700 shrink-0" />
                <span><strong>Desktop (Chrome/Edge):</strong> Click the <strong>Install</strong> icon in the address bar (top right).</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-700 shrink-0" />
                <span><strong>Android (Chrome):</strong> Tap the 3-dot menu and select <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Fast Offline Launch
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> No App Store Needed
          </span>
        </div>
      </div>
    </div>
  );
};
