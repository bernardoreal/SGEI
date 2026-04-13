'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquarePlus, Send, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="mt-12 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
          <MessageSquarePlus size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sugestões de Melhoria</h3>
          <p className="text-slate-500 text-sm font-medium">Sua opinião é fundamental para evoluirmos o sistema.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-bold text-emerald-900 mb-2">Sugestão Enviada!</h4>
            <p className="text-emerald-700 font-medium">Obrigado pela sua contribuição. Nossa equipe irá analisar sua sugestão.</p>
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
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                  required
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
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
                  className="w-full bg-latam-indigo text-white py-4 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-100 disabled:bg-slate-300 flex items-center justify-center gap-2"
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
  );
}
