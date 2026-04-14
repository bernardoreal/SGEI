'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-latam-indigo text-white">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
        <p className="font-medium animate-pulse">Carregando sua sessão...</p>
      </div>
    );
  }

  if (!user) return null;

  const isSupervisor = pathname.startsWith('/dashboard/supervisor');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-latam-indigo rounded-lg flex items-center justify-center text-white font-bold">L</div>
                <span className="font-bold text-xl text-latam-indigo tracking-tight">LATAM <span className="text-latam-crimson">SGEI</span></span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{user.email}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">Sessão Ativa</div>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-latam-crimson transition-colors border border-gray-100 rounded-xl hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-8">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-latam-indigo/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-latam-crimson">
                    <AlertTriangle size={24} />
                  </div>
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-latam-indigo mb-2">Confirmar Saída</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  Tem certeza que deseja sair do sistema? Suas alterações não salvas podem ser perdidas.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push('/');
                    }}
                    className="flex-1 bg-latam-crimson hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-latam-crimson/20 text-sm"
                  >
                    Confirmar Sair
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
