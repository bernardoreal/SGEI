'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, handleSupabaseSessionError, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

const AuthContext = createContext<{
  user: any | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        // Usamos getSession() apenas para inicialização
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (await handleSupabaseSessionError(error)) {
          setLoading(false);
          return;
        }
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
        }
        
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Auth Provider - Critical Error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth State Changed:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        if (pathname !== '/' && pathname !== '/register') {
          router.replace('/');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname, configured]);

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B1120] p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-red-100 dark:border-slate-700">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Configuração Necessária</h1>
            <p className="text-gray-600 dark:text-slate-400 mb-8">
              As variáveis de ambiente do Supabase não foram encontradas. 
              Por favor, configure <code className="bg-gray-100 dark:bg-slate-900 px-1 rounded text-red-600 dark:text-red-400">NEXT_PUBLIC_SUPABASE_URL</code> e 
              <code className="bg-gray-100 dark:bg-slate-900 px-1 rounded text-red-600 dark:text-red-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no painel de segredos do AI Studio.
            </p>
            <div className="w-full space-y-3">
              <div className="text-sm text-left bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="font-semibold text-gray-700 dark:text-slate-200 mb-1">Passos para resolver:</p>
                <ol className="list-decimal list-inside text-gray-600 dark:text-slate-400 space-y-1">
                  <li>Acesse as Configurações (ícone de engrenagem)</li>
                  <li>Vá para a aba &quot;Secrets&quot;</li>
                  <li>Adicione as chaves mencionadas acima</li>
                  <li>O preview será reiniciado automaticamente</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
