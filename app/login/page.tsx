'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plane, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [bp, setBp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Find user by BP
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('bp', bp)
        .single();

      if (userError || !userData) {
        throw new Error('Colaborador não encontrado.');
      }

      // 2. Sign in with email and password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });

      if (authError) throw authError;

      // 3. Redirect based on role
      const role = userData.roles[0];
      if (role === 'admin') router.push('/dashboard/admin');
      else if (role === 'manager') router.push('/dashboard/manager');
      else if (role === 'coordinator') router.push('/dashboard/coordinator');
      else if (role === 'supervisor') router.push('/dashboard/supervisor');
      else router.push('/dashboard/employee');

    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-latam-indigo flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-latam-crimson rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-red-100">
            <Plane className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">LATAM SGEI</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Sistema de Gestão de Escalas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BP (Matrícula)</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={bp}
                onChange={e => setBp(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-latam-indigo outline-none transition-all"
                placeholder="Digite seu BP"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-latam-indigo outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-latam-indigo text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#001a54] transition-all shadow-xl shadow-indigo-100 disabled:bg-slate-200"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            © 2024 LATAM Airlines Group. Todos os direitos reservados.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
