'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'no-user' | 'pending'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança para mostrar o botão de ajuda
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.log('Timeout de 3.5s atingido. Mostrando opções de recuperação.');
        setShowRetry(true);
      }
    }, 3500);

    const checkAccess = async () => {
      try {
        console.log('--- Iniciando Verificação de Acesso ---');
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Erro de autenticação Supabase:', authError);
          
          // Se o erro for de refresh token inválido, limpa e redireciona
          if (authError.message.includes('Refresh Token Not Found') || authError.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            router.replace('/');
            return;
          }

          setStatus('error');
          setErrorDetails(`Falha na autenticação: ${authError.message}`);
          return;
        }

        if (!session || !session.user) {
          console.log('Nenhuma sessão encontrada. Redirecionando para login.');
          router.replace('/');
          return;
        }

        const email = session.user.email?.toLowerCase();
        setUserEmail(email || 'E-mail não identificado');
        console.log('Sessão ativa detectada para:', email);

        // REGRA DE OURO: Se for o e-mail do Bernardo, redireciona direto para Admin
        // Isso evita que você fique travado por problemas de RLS ou latência no banco
        if (email === 'bernardo.real@latam.com') {
          console.log('Acesso Admin detectado via e-mail. Redirecionando...');
          window.location.href = '/dashboard/admin';
          return;
        }

        console.log('Consultando tabela "users" para verificar permissões...');
        
        // Consulta com timeout manual via Promise.race
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('roles')
          .ilike('email', email!)
          .maybeSingle();

        if (!isMounted) return;

        if (dbError) {
          console.error('Erro retornado pelo banco de dados:', dbError);
          setStatus('error');
          setErrorDetails(`Erro de banco (Código ${dbError.code}): ${dbError.message}`);
          return;
        }

        if (!dbUser) {
          console.warn('Nenhum registro encontrado na tabela "users" para:', email);
          setStatus('no-user');
          return;
        }

        const userRoles = dbUser.roles || [];
        console.log('Perfil localizado com sucesso. Roles:', userRoles);
        
        // Se a lista de roles estiver vazia ou contiver apenas 'pending', mostra tela de espera
        if (userRoles.length === 0 || (userRoles.length === 1 && userRoles[0] === 'pending')) {
          console.log('Usuário aguardando atribuição de cargo.');
          setStatus('pending');
          return;
        }

        // Determina a página de destino baseada na hierarquia de papéis
        const rolePriority = ['admin', 'manager', 'coordinator', 'supervisor', 'employee'];
        const primaryRole = rolePriority.find(r => userRoles.includes(r));

        if (primaryRole) {
          window.location.href = `/dashboard/${primaryRole}`;
        } else {
          console.error('Nenhuma role válida ou autorizada encontrada:', userRoles);
          setStatus('error');
          setErrorDetails('Seu perfil não possui uma role válida configurada. Contate o administrador.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Erro crítico inesperado:', err);
        setStatus('error');
        setErrorDetails(err instanceof Error ? err.message : 'Erro interno desconhecido');
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router]);

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-latam-indigo p-4">
        <div className="max-w-md w-full glass rounded-[32px] p-8 md:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-latam-crimson" />
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 p-5 rounded-3xl text-white backdrop-blur-md border border-white/20">
              <Clock size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Aguardando Aprovação</h2>
          <p className="text-white/70 mb-8 leading-relaxed font-medium">
            Seu cadastro foi recebido com sucesso. Por motivos de segurança, um administrador precisa revisar seu perfil e atribuir seu cargo antes que você possa acessar o sistema.
          </p>
          <div className="p-5 bg-white/5 rounded-2xl mb-8 text-left border border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Usuário Identificado:</p>
            <p className="text-sm font-bold text-white">{userEmail}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white text-latam-indigo py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-xl active:scale-[0.98]"
          >
            Verificar Status Novamente
          </button>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="w-full mt-6 text-white/50 text-xs font-bold uppercase tracking-widest hover:text-latam-crimson transition-colors"
          >
            Sair do Sistema
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-latam-indigo p-4">
        <div className="max-w-md w-full glass rounded-[32px] p-8 md:p-10 border-t-4 border-latam-crimson">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-latam-crimson/20 p-3 rounded-2xl text-latam-crimson">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Erro de Acesso</h2>
          </div>
          <p className="text-white/70 mb-8 font-medium leading-relaxed">{errorDetails}</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-white text-latam-indigo py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-xl active:scale-[0.98]"
          >
            Tentar Novamente
          </button>
          <button 
            onClick={() => router.push('/')}
            className="w-full mt-6 text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  if (status === 'no-user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-latam-indigo p-4">
        <div className="max-w-md w-full glass rounded-[32px] p-8 md:p-10 border-t-4 border-amber-500">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-amber-500/20 p-3 rounded-2xl text-amber-500">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Perfil não encontrado</h2>
          </div>
          <p className="text-white/80 text-sm mb-4 font-medium">
            Logado como: <span className="font-bold text-white">{userEmail}</span>
          </p>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            Sua conta de e-mail está ativa, mas você ainda não possui um perfil de acesso configurado na base de dados da LATAM Cargo.
          </p>
          <button 
            onClick={() => router.push('/register')}
            className="w-full bg-white text-latam-indigo py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-xl active:scale-[0.98]"
          >
            Realizar Cadastro Inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-latam-indigo">
      <div className="text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/10 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-latam-crimson rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SGEI LATAM Cargo</h1>
          <p className="text-white/40 mt-2 font-medium">Validando credenciais para {userEmail || '...'}</p>
        </div>
        {showRetry && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <p className="text-sm text-amber-400 mb-6 font-medium">O carregamento está demorando mais que o esperado...</p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-2xl hover:bg-white/20 transition-all font-bold text-sm"
              >
                Recarregar Página
              </button>
              <button 
                onClick={() => router.push('/register')}
                className="text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Tentar Cadastro de Primeiro Acesso
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
