'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight,
  AlertCircle,
  X,
  KeyRound
} from 'lucide-react';

const LATAM_LOGO = "data:image/png;base64,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";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [retrievedPassword, setRetrievedPassword] = useState<string | null>(null);
  const [retrievedEmail, setRetrievedEmail] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  // Limpar sessões expiradas/inválidas ao carregar a página
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          // Silently handle expired sessions
          await supabase.auth.signOut();
          localStorage.clear();
        } else {
          console.warn('Erro de sessão detectado, limpando storage:', sessionError.message);
          await supabase.auth.signOut();
          localStorage.clear();
        }
      } else if (session) {
        // Se já existe uma sessão válida, redireciona para o dashboard
        window.location.href = '/dashboard';
      }
    };
    
    checkSession();
  }, []);

  const handleForgotPassword = async () => {
    const cleanInput = email.trim();
    if (!cleanInput) {
      setError('Por favor, digite seu E-mail ou BP primeiro.');
      return;
    }

    setForgotLoading(true);
    setError(null);

    try {
      let query = supabase.from('users').select('password_plain, email');
      
      if (cleanInput.includes('@')) {
        query = query.eq('email', cleanInput);
      } else {
        query = query.eq('bp', cleanInput);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar usuário:', fetchError);
        setError(`Erro técnico: ${fetchError.message}`);
        return;
      }

      if (!data) {
        setError('Usuário não encontrado para recuperar a senha. Verifique se digitou corretamente.');
        return;
      }

      if (!data.password_plain) {
        setError('Este usuário não possui uma senha simples cadastrada para recuperação direta.');
        return;
      }

      setRetrievedEmail(data.email);
      try {
        setRetrievedPassword(decodeURIComponent(escape(atob(data.password_plain))));
      } catch (e) {
        // Fallback se a senha não estiver em base64 ou formato antigo
        try {
          setRetrievedPassword(atob(data.password_plain));
        } catch (e2) {
          setRetrievedPassword(data.password_plain);
        }
      }
      setIsChangingPassword(false);
      setNewPassword('');
      setShowForgotModal(true);
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro ao recuperar senha.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangeLoading(true);
    setError(null);

    try {
      // 1. Logar o usuário temporariamente para poder alterar a senha
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: retrievedEmail!,
        password: retrievedPassword!,
      });

      if (loginError) {
        throw loginError;
      }

      // 2. Atualizar a senha no Supabase Auth
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateAuthError) {
        throw updateAuthError;
      }

      // 3. Atualizar a senha na tabela users (anonimizada)
      const anonPassword = btoa(unescape(encodeURIComponent(newPassword)));
      const { error: updateTableError } = await supabase.from('users')
        .update({ password_plain: anonPassword })
        .eq('email', retrievedEmail!);

      if (updateTableError) {
        throw updateTableError;
      }

      // 4. Sucesso! Limpar estados e fechar modal
      setRetrievedPassword(newPassword);
      setIsChangingPassword(false);
      setNewPassword('');
      // Opcional: deslogar para forçar login com a nova senha ou manter logado
      // Por segurança, vamos manter logado e redirecionar se quiser, mas aqui apenas fechamos o modal
      setShowForgotModal(false);
      setError(null);
      alert('Senha alterada com sucesso! Você já pode entrar no sistema.');
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setError(`Erro ao alterar senha: ${err.message}`);
    } finally {
      setChangeLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanInput = email.trim();
    let loginEmail = cleanInput;

    // Se não for e-mail (não contém @), busca o e-mail pelo BP
    if (!cleanInput.includes('@')) {
      const { data, error: bpError } = await supabase
        .from('users')
        .select('email')
        .eq('bp', cleanInput)
        .maybeSingle();

      if (bpError) {
        console.error('Erro na busca por BP:', bpError);
        setError(`Erro técnico ao buscar BP: ${bpError.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('BP não encontrado. Se este é seu primeiro acesso, realize o cadastro inicial abaixo.');
        setLoading(false);
        return;
      }
      loginEmail = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.trim(),
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('E-mail/BP ou senha incorretos.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-latam-indigo">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-latam-crimson/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-[32px] overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl p-3"
            >
              <img src={LATAM_LOGO} alt="LATAM Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-3xl font-bold text-latam-indigo tracking-tight">LATAM Cargo</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">SGEI - Gestão de Escalas</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3"
              >
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-latam-indigo/60 ml-1">Identificação</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="E-mail ou BP" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-latam-indigo/60">Senha</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-[10px] font-bold uppercase tracking-widest text-latam-crimson hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Buscando...' : 'Esqueci minha senha'}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-latam-indigo hover:bg-[#001a54] text-white font-bold py-4 rounded-2xl shadow-xl shadow-latam-indigo/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-6 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-white/40 backdrop-blur-md p-6 border-t border-white/20 text-center">
          <p className="text-sm text-slate-600">
            Ainda não tem acesso? <a href="/register" className="text-latam-crimson font-bold hover:underline">Cadastre-se aqui</a>
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-latam-indigo/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="w-12 h-12 bg-latam-indigo/10 rounded-2xl flex items-center justify-center text-latam-indigo">
                    <KeyRound size={24} />
                  </div>
                  <button 
                    onClick={() => {
                      setShowForgotModal(false);
                      setIsChangingPassword(false);
                      setNewPassword('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-latam-indigo mb-2">
                  {isChangingPassword ? 'Alterar Senha' : 'Recuperação de Senha'}
                </h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  {isChangingPassword 
                    ? 'Digite sua nova senha abaixo para atualizar seu acesso.' 
                    : 'Identificamos sua conta no sistema. Guarde sua senha em um local seguro.'}
                </p>

                {isChangingPassword ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                      <input 
                        type="password" 
                        placeholder="Nova senha (mín. 6 caracteres)" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full pl-12 pr-4 py-4 bg-latam-indigo/5 border border-latam-indigo/10 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 outline-none transition-all text-latam-indigo font-medium"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsChangingPassword(false)}
                        className="flex-1 px-4 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleChangePassword}
                        disabled={changeLoading}
                        className="flex-[2] bg-latam-crimson hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-latam-crimson/20 disabled:opacity-50"
                      >
                        {changeLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-latam-indigo/5 border border-latam-indigo/10 rounded-3xl p-8 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-latam-crimson" />
                      <p className="text-[10px] font-bold text-latam-indigo/40 uppercase tracking-[0.2em] mb-3">Sua senha é:</p>
                      <p className="text-3xl font-black text-latam-indigo tracking-tight">{retrievedPassword}</p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <button 
                        onClick={() => setIsChangingPassword(true)}
                        className="w-full text-sm font-bold text-latam-crimson hover:underline"
                      >
                        Deseja alterar sua senha? Clique aqui
                      </button>
                      <button 
                        onClick={() => {
                          setShowForgotModal(false);
                          setIsChangingPassword(false);
                          setNewPassword('');
                        }}
                        className="w-full bg-latam-indigo hover:bg-[#001a54] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-latam-indigo/20"
                      >
                        Entendido
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
