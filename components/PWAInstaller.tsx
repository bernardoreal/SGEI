'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if already installed
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      
      setIsStandalone(isPWA);

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      if (isIosDevice && !isPWA) {
         // On iOS, we show a custom guide since beforeinstallprompt isn't supported
         const hasDismissed = localStorage.getItem('dismissPWAInstall');
         if (!hasDismissed) {
           setShowInstallBtn(true);
         }
      }
    }, 0);

    // Handle standard PWA Install Prompt (Chrome/Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem('dismissPWAInstall');
      if (!hasDismissed) {
        setShowInstallBtn(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
       alert("No iOS: Toque em 'Compartilhar' na barra inferior e depois em 'Adicionar à Tela de Início'.");
       return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInstallBtn(false);
    localStorage.setItem('dismissPWAInstall', 'true');
  };

  if (!showInstallBtn || isStandalone) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-indigo-600 shadow-xl rounded-2xl p-1 flex items-stretch">
        <button 
          onClick={handleInstallClick}
          className="flex-1 hover:bg-indigo-700 text-white font-bold py-3 pl-4 pr-5 rounded-xl flex items-center gap-2 transition-colors ui-active"
        >
          <Download size={20} />
          <div className="text-left leading-tight">
            <span className="block text-sm">Instalar App SGEI</span>
            <span className="block text-[10px] text-indigo-200 font-normal">Acesso Rápido Sem Offline</span>
          </div>
        </button>
        <button 
          onClick={dismiss} 
          className="px-3 hover:bg-indigo-700 text-indigo-300 hover:text-white rounded-xl transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
