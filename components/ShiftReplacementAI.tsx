'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2, UserPlus, Clock, Zap, ShieldAlert, HeartPulse, Send, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShiftReplacementProps {
  missingEmployeeBp?: string;
  missingDate?: string;
  baseId?: string;
  onSelectReplacement?: (bp: string) => void;
}

export default function ShiftReplacementAI({ missingEmployeeBp, missingDate, baseId, onSelectReplacement }: ShiftReplacementProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [resolved, setResolved] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    // Simulate AI call
    setTimeout(() => {
      setSuggestions([
        {
          bp: 'BP-8812',
          name: 'Carlos Silva',
          matchScore: 98,
          reason: 'Não ultrapassa limite de horas (44h mensais). Possui CAT-6 para cobrir a ausência operacional e está com índice de fadiga em 12%.',
          isCat6: true,
          overtimeCost: 'Sem HE',
          fatigueRisk: 'Baixo (12%)'
        },
        {
          bp: 'BP-9200',
          name: 'Mariana Costa',
          matchScore: 85,
          reason: 'Adequada, porém resultará em pagamento de hora extra (HE) de 6h. Habilidades compatíveis.',
          isCat6: false,
          overtimeCost: '+ R$ 240,00',
          fatigueRisk: 'Médio (45%)'
        }
      ]);
      setAnalyzed(true);
      setLoading(false);
    }, 2000);
  };

  const handleResolve = (bp: string, name: string) => {
    setResolved(true);
    
    const notificationTitle = `SGEI Auto-Healing: Ação Requerida`;
    const notificationBody = `SMS/Push enviado para ${name.split(' ')[0]}: precisamos de você para cobertura de turno hoje (MANHÃ). Confirma o aceite?`;

    // Simulate the exact push notification the employee receives in toast
    toast.success(`Notificação Push e SMS enviados para ${name}`, {
      description: notificationBody,
      icon: <Smartphone className="text-white" />,
      duration: 5000,
      className: 'bg-indigo-600 text-white border-indigo-700',
    });

    // Request OS native push notification via Service Worker (Works on Mobile iOS/Android as PWA)
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const showNativePush = () => {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(notificationTitle, { 
            body: notificationBody, 
            icon: '/favicon.ico',
            vibrate: [200, 100, 200, 500, 200, 100, 200],
            requireInteraction: true,
            badge: '/favicon.ico'
          });
        });
      };

      if (Notification.permission === 'granted') {
        showNativePush();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNativePush();
          }
        });
      }
    }

    if (onSelectReplacement) {
      setTimeout(() => {
        onSelectReplacement(bp);
      }, 1500);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      {/* Background Pulse for Action Required */}
      {!analyzed && !loading && !resolved && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-orange-500 animate-pulse"></div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={18} />
          <h4 className="font-bold uppercase tracking-tight text-sm">Action Required: Falta Inesperada</h4>
        </div>
        {!analyzed && !loading && !resolved && (
          <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-2 py-1 rounded">Hoje, Turno MANHÃ</span>
        )}
      </div>

      {!analyzed && !loading && !resolved && (
         <div className="mb-4">
           <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
             O sistema detectou um desfalque crítico: <strong className="text-slate-900 dark:text-white">João Pedro (CAT-6)</strong> não confirmou check-in.
           </p>
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
             A ausência rompe a cobertura CAT-6 no manejo de cargas especiais. Acione a auto-resolução.
           </p>
           <button 
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white p-3 rounded-xl font-bold transition-all text-sm shadow-md"
          >
            <Sparkles size={16} className="text-amber-400" />
            Auto-Resolutividade AI (Self-Healing)
          </button>
         </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Cruzando Variáveis Operationais...</p>
            <p className="text-[10px] text-slate-500 font-medium animate-pulse">Custo • Compliance (CAT-6) • Risco de Fadiga</p>
          </div>
        </div>
      )}

      {analyzed && !resolved && (
        <div className="space-y-3">
          {suggestions.map((sug, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 relative hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
              {idx === 0 && (
                <div className="absolute -top-2.5 -right-2.5 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                   <Zap size={10} /> O melhor match
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {sug.name}
                    {sug.isCat6 && <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase ring-1 ring-amber-200 dark:ring-amber-800/50">CAT-6</span>}
                  </h5>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{sug.matchScore}% Score</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                 <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                   <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                     <Clock size={12} /> Impacto de Custo
                   </div>
                   <span className={`text-xs font-bold ${sug.overtimeCost === 'Sem HE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                     {sug.overtimeCost}
                   </span>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded p-2 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                   <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                     <HeartPulse size={12} /> Índice Fadiga
                   </div>
                   <span className={`text-xs font-bold ${sug.fatigueRisk.includes('Baixo') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                     {sug.fatigueRisk}
                   </span>
                 </div>
              </div>

              <div className="flex justify-end mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => handleResolve(sug.bp, sug.name)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Send size={14} />
                  1-Click Resolve: Acionar {sug.name.split(' ')[0]}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {resolved && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center justify-center p-6 text-center"
           >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-full mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Ação Autorizada!</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                SMS e notificação no app enviados para o colaborador selecionado. A escala oficial já foi atualizada pelo <strong className="text-indigo-600 dark:text-indigo-400">SGEI Auto-Healing</strong>.
              </p>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

