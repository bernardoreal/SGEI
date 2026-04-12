'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Usamos getSession() apenas para inicialização
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Se o token for inválido, limpamos o estado e redirecionamos silenciosamente
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
            console.warn('Sessão expirada ou inválida. Redirecionando para login...');
            await supabase.auth.signOut();
            localStorage.removeItem('sgei-auth-token'); // Limpa a chave específica configurada
            if (pathname !== '/' && pathname !== '/register') {
              router.replace('/');
            }
          } else {
            console.error('Auth Provider - Session Error:', error.message);
          }
        }
        
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Auth Provider - Critical Error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
  }, [router, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
