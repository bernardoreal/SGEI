'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquarePlus, Send, CheckCircle2, Clock, Activity, CheckCircle, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SuggestionSectionProps {
  userId: string;
  userName: string;
  userRole: string;
}

export default function SuggestionSection({ userId, userName, userRole }: SuggestionSectionProps) {
  const [suggestion, setSuggestion] = useState('');
  const [priority, setPriority] = useState('média');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mySuggestions, setMySuggestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchMySuggestions = async () => {
      const { data } = await supabase
        .from('system_suggestions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (data) setMySuggestions(data);
    };

    fetchMySuggestions();

    const channel = supabase
      .channel('my-suggestions-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'system_suggestions',
        filter: `user_id=eq.${userId}`
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setMySuggestions(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setMySuggestions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setMySuggestions(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_suggestions')
        .insert({
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          suggestion: suggestion.trim(),
          priority: priority
        });

      if (error) throw error;

      setSubmitted(true);
      setSuggestion('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Erro ao enviar sugestão:', err);
      alert('Erro ao enviar sugestão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pendente': return <Clock size={14} className="text-amber-500" />;
      case 'em_analise': return <Activity size={14} className="text-blue-500" />;
      case 'implementado': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'arquivado': return <Archive size={14} className="text-slate-500" />;
      default: return <Clock size={14} className="text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pendente': return 'Pendente';
      case 'em_analise': return 'Em Análise';
      case 'implementado': return 'Em Progresso'; // Ajustado para refletir o Kanban
      case 'arquivado': return 'Finalizado'; // Ajustado para refletir o Kanban
      default: return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pendente': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      case 'em_analise': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 'implementado': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      case 'arquivado': return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
    }
  };

  return (
    <div className="mt-12 space-y-6">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <MessageSquarePlus size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sugestões de Melhoria</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sua opinião é fundamental para evoluirmos o sistema.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-8 rounded-2xl text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-400 mb-2">Sugestão Enviada!</h4>
              <p className="text-emerald-700 dark:text-emerald-500 font-medium">Obrigado pela sua contribuição. Nossa equipe irá analisar sua sugestão.</p>
            </motion.div>
          ) : (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <textarea
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="Descreva sua sugestão de melhoria ou nova funcionalidade..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Prioridade</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-300"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="média">Média</option>
                      <option value="alta">Alta</option>
                      <option value="crítica">Crítica</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !suggestion.trim()}
                    className="w-full bg-latam-indigo text-white py-4 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-100 dark:shadow-none disabled:bg-slate-300 dark:disabled:bg-slate-700 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Enviar <Send size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {mySuggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
          <h4 className="font-bold text-slate-900 dark:text-white mb-6">Minhas Solicitações</h4>
          <div className="space-y-4">
            {mySuggestions.map(s => (
              <div key={s.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{s.suggestion}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      s.priority === 'crítica' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      s.priority === 'alta' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      s.priority === 'média' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {s.priority}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getStatusColor(s.status)}`}>
                  {getStatusIcon(s.status)}
                  <span className="text-xs font-bold uppercase tracking-wider">{getStatusText(s.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
