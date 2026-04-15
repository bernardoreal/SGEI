'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Users, Settings, LogOut, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (data) setUserRole(data.role);
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const actions = [
    {
      id: 'dashboard',
      title: 'Ir para o Dashboard',
      icon: <Calendar size={18} />,
      keywords: ['home', 'inicio', 'escala', 'painel'],
      perform: () => {
        if (userRole === 'admin') router.push('/dashboard/admin');
        else if (userRole === 'supervisor') router.push('/dashboard/supervisor');
        else if (userRole === 'coordinator' || userRole === 'manager') router.push('/dashboard/coordinator');
        else router.push('/dashboard/employee');
      }
    },
    {
      id: 'employees',
      title: 'Gestão de Colaboradores',
      icon: <Users size={18} />,
      keywords: ['equipe', 'funcionarios', 'pessoas', 'bp'],
      perform: () => {
        if (userRole === 'supervisor') router.push('/dashboard/supervisor/employees');
        else if (userRole === 'admin') router.push('/dashboard/admin/users');
      }
    },
    {
      id: 'settings',
      title: 'Configurações',
      icon: <Settings size={18} />,
      keywords: ['ajustes', 'config', 'perfil'],
      perform: () => {
        // Exemplo genérico, pode ser ajustado
        router.push('/dashboard/supervisor/config');
      }
    },
    {
      id: 'logout',
      title: 'Sair do Sistema',
      icon: <LogOut size={18} />,
      keywords: ['sair', 'logout', 'deslogar'],
      perform: async () => {
        await supabase.auth.signOut();
        router.push('/');
      }
    }
  ];

  const filteredActions = actions.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.keywords.some(k => k.includes(search.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-100"
          >
            <div className="flex items-center px-4 py-4 border-b border-slate-100">
              <Search className="text-slate-400 mr-3" size={20} />
              <input 
                ref={inputRef}
                type="text"
                placeholder="O que você precisa fazer? (Busque por ações...)"
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">
                ESC para fechar
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredActions.length > 0 ? (
                <div className="space-y-1">
                  {filteredActions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.perform)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-3 text-slate-700 group-hover:text-indigo-700">
                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                          {action.icon}
                        </div>
                        <span className="font-medium">{action.title}</span>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <p>Nenhuma ação encontrada para "{search}"</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
