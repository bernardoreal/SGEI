'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Calendar, Users, Settings, LogOut, ArrowRight, 
  Moon, Sun, Shield, FileText, MessageSquare, Home, 
  PlusCircle, Download, FileJson, History
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeProvider';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (data) setUserRole(data.role);
      }
    };
    fetchRole();
  }, [pathname]); // Refresh role on navigation in case it changes

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    setSearch('');
    // Use a small timeout to allow the palette to close before navigating
    // This helps Next.js navigation feel smoother and avoids potential lag
    setTimeout(() => {
      action();
    }, 50);
  };

  const getActions = () => {
    const isAdmin = userRole === 'admin';
    const isSupervisor = userRole === 'supervisor';
    const isCoordinator = userRole === 'coordinator' || userRole === 'manager';
    const isEmployee = userRole === 'employee';
    
    // Core Actions (Always present)
    const baseActions = [
      {
        id: 'home',
        title: 'Página Inicial / Dashboard',
        icon: <Home size={18} />,
        keywords: ['home', 'inicio', 'escala', 'painel', 'voltar'],
        perform: () => {
          if (isAdmin) router.push('/dashboard/admin');
          else if (isSupervisor) router.push('/dashboard/supervisor');
          else if (isCoordinator) router.push('/dashboard/coordinator');
          else router.push('/dashboard/employee');
        }
      },
      {
        id: 'theme',
        title: theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro',
        icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
        keywords: ['tema', 'escuro', 'claro', 'dark', 'light', 'modo', 'cor'],
        perform: () => {
          toggleTheme();
        }
      },
      {
        id: 'suggestions',
        title: 'Enviar Sugestão / Falar com Desenvolvedor',
        icon: <MessageSquare size={18} />,
        keywords: ['feedback', 'sugestao', 'ajuda', 'suporte', 'melhoria', 'bug'],
        perform: () => {
          router.push('/dashboard?action=suggest');
        }
      }
    ];

    const roleActions = [];

    // Context: Admin
    if (isAdmin) {
      roleActions.push(
        {
          id: 'admin_users',
          title: 'Gestão de Usuários (Admin)',
          icon: <Shield size={18} />,
          keywords: ['permissões', 'contas', 'usuarios', 'acesso'],
          perform: () => router.push('/dashboard/admin')
        },
        {
          id: 'admin_logs',
          title: 'Logs de Auditoria',
          icon: <History size={18} />,
          keywords: ['audit', 'historico', 'quem fez o que', 'segurança'],
          perform: () => router.push('/dashboard/admin?tab=logs')
        }
      );
    }

    // Context: Supervisor
    if (isSupervisor) {
      roleActions.push(
        {
          id: 'sup_employees',
          title: 'Gestão de Colaboradores (Base)',
          icon: <Users size={18} />,
          keywords: ['equipe', 'equipe', 'funcionarios', 'pessoas', 'bp', 'cadastrar'],
          perform: () => router.push('/dashboard/supervisor')
        },
        {
          id: 'sup_generate',
          title: 'Gerar Nova Escala (IA)',
          icon: <PlusCircle size={18} />,
          keywords: ['escala', 'gerar', 'inteligencia', 'automacao', 'turno'],
          perform: () => router.push('/dashboard/supervisor?action=generate')
        },
        {
          id: 'sup_config',
          title: 'Configurar Regras da Base',
          icon: <Settings size={18} />,
          keywords: ['cobertura', 'cat6', 'parametros', 'regras'],
          perform: () => router.push('/dashboard/supervisor')
        }
      );
    }

    // Context: Coordinator/Manager
    if (isCoordinator) {
      roleActions.push(
        {
          id: 'coord_reports',
          title: 'Relatórios Consolidados',
          icon: <Download size={18} />,
          keywords: ['pdf', 'excel', 'exportar', 'baixar', 'dados'],
          perform: () => router.push('/dashboard/coordinator')
        }
      );
    }

    const footerActions = [
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

    return [...roleActions, ...baseActions, ...footerActions];
  };


  const filteredActions = getActions().filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.keywords.some(k => k.includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleAction(filteredActions[selectedIndex].perform);
        }
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, selectedIndex, filteredActions]);

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
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-700">
              <Search className="text-slate-400 mr-3" size={20} />
              <input 
                ref={inputRef}
                type="text"
                placeholder="O que você precisa fazer? (Busque por ações...)"
                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
              />
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded uppercase tracking-widest">
                ESC para fechar
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
              {filteredActions.length > 0 ? (
                <div className="space-y-1">
                  {filteredActions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.perform)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 outline-none text-left group ${
                        idx === selectedIndex 
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 ring-1 ring-indigo-200 dark:ring-indigo-500/40 translate-x-1' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className={`flex items-center gap-3 transition-colors ${
                        idx === selectedIndex 
                        ? 'text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        <div className={`p-2 rounded-lg transition-colors ${
                          idx === selectedIndex 
                          ? 'bg-indigo-100 dark:bg-indigo-500/30' 
                          : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                          {action.icon}
                        </div>
                        <span className="font-semibold">{action.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx === selectedIndex && (
                          <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-tighter">Enter</span>
                        )}
                        <ArrowRight size={16} className={`transition-all duration-300 ${
                          idx === selectedIndex 
                          ? 'text-indigo-500 dark:text-indigo-400 opacity-100 translate-x-0' 
                          : 'text-slate-300 dark:text-slate-600 opacity-0 -translate-x-2'
                        }`} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <p>Nenhuma ação encontrada para &quot;{search}&quot;</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
