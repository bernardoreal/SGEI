'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem('sgei-auth-token');
                  router.push('/');
                }}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-latam-crimson transition-colors border border-gray-100 rounded-xl hover:bg-red-50"
              >
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
    </div>
  );
}
