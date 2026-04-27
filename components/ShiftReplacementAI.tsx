'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2, UserPlus, Clock, Zap } from 'lucide-react';

interface ShiftReplacementProps {
  missingEmployeeBp: string;
  missingDate: string;
  baseId: string;
  onSelectReplacement: (bp: string) => void;
}

export default function ShiftReplacementAI({ missingEmployeeBp, missingDate, baseId, onSelectReplacement }: ShiftReplacementProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    // Simulate AI call
    setTimeout(() => {
      setSuggestions([
        {
          bp: 'BP-8812',
          name: 'Carlos Silva',
          matchScore: 98,
          reason: 'Não ultrapassa limite de horas (44h mensais). Possui CAT-6 para cobrir a ausência operacional e está de folga hoje.',
          isCat6: true,
          overtimeCost: 'Baixo'
        },
        {
          bp: 'BP-9200',
          name: 'Mariana Costa',
          matchScore: 85,
          reason: 'Adequado, porém resultará em pagamento de hora extra (HE) de 6h. Habilidades compatíveis.',
          isCat6: false,
          overtimeCost: 'Médio'
        }
      ]);
      setAnalyzed(true);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Sparkles size={18} />
          <h4 className="font-bold uppercase tracking-tight text-sm">Resolução de Faltas com IA</h4>
        </div>
      </div>

      {!analyzed && !loading && (
        <button 
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-colors text-sm"
        >
          <Zap size={16} />
          Encontrar Substitutos Ideais
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cruzando variáveis de RH, fadiga e custos...</p>
        </div>
      )}

      {analyzed && (
        <div className="space-y-3">
          {suggestions.map((sug, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {sug.name}
                    {sug.isCat6 && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">CAT-6</span>}
                  </h5>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{sug.bp}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{sug.matchScore}% Match</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                {sug.reason}
              </p>

              <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <Clock size={12} />
                  <span>Custo Oculto (HE): <span className={sug.overtimeCost === 'Baixo' ? 'text-emerald-500' : 'text-amber-500'}>{sug.overtimeCost}</span></span>
                </div>
                <button 
                  onClick={() => onSelectReplacement(sug.bp)}
                  className="flex items-center gap-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <UserPlus size={14} />
                  Aplicar Substituto
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
