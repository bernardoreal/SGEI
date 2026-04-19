'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, UserPlus, Lightbulb, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ email, userId }: { email: string, userId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      // O Bernardo é Admin
      if (email === 'bernardo.real@latam.com') {
        setIsAdmin(true);
        return;
      }
      
      const { data } = await supabase.from('users').select('roles').eq('id', userId).single();
      if (data && data.roles?.includes('admin')) {
        setIsAdmin(true);
      }
    };
    if (userId) {
      checkAdmin();
    }
  }, [userId, email]);

  const fetchNotifications = async () => {
    const notifs: any[] = [];
    
    // Novas solicitações de acesso (roles array contains 'pending')
    const { data: pendingUsers } = await supabase
      .from('users')
      .select('id, name, created_at')
      .contains('roles', ['pending']);
      
    if (pendingUsers) {
      pendingUsers.forEach((u: any) => {
        notifs.push({
          id: `user-${u.id}`,
          type: 'access',
          title: 'Nova Solicitação de Acesso',
          message: `${u.name} solicitou acesso ao sistema.`,
          created_at: u.created_at,
          link: '/dashboard/admin'
        });
      });
    }

    // Sugestões de melhoria (status = 'pendente')
    const { data: pendingSuggestions } = await supabase
      .from('system_suggestions')
      .select('id, user_name, created_at')
      .eq('status', 'pendente');

    if (pendingSuggestions) {
      pendingSuggestions.forEach((s: any) => {
        notifs.push({
          id: `sug-${s.id}`,
          type: 'suggestion',
          title: 'Nova Sugestão',
          message: `${s.user_name} enviou uma sugestão de melhoria.`,
          created_at: s.created_at,
          link: '/dashboard/admin'
        });
      });
    }

    // Order by newest first
    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(notifs);
  };

  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      await fetchNotifications();
    };

    loadData();

    const channel = supabase.channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_suggestions' }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 dark:text-slate-300 hover:text-latam-indigo dark:hover:text-white transition-colors border border-gray-100 dark:border-slate-700/50 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 flex items-center justify-center"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-latam-crimson border-2 border-white dark:border-[#0B1120] rounded-full"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-latam-indigo/10 dark:shadow-black/40 border border-gray-100 dark:border-slate-700 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Notificações
                  {notifications.length > 0 && (
                    <span className="bg-latam-crimson text-white text-[10px] px-2 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 dark:text-slate-500 flex flex-col items-center gap-3">
                    <CheckCircle2 size={32} className="text-gray-300 dark:text-slate-600" />
                    <p className="text-sm">Tudo em dia! Nenhuma notificação pendente.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(notif.link);
                        }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer flex gap-3 group"
                      >
                        <div className="mt-1 flex-shrink-0">
                          {notif.type === 'access' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                              <UserPlus size={16} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                              <Lightbulb size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{notif.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 block font-medium">
                            {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
