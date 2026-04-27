'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Activity, UserMinus, ShieldAlert, ChevronRight } from 'lucide-react';

interface RiskAnalyticsProps {
  baseId: string;
}

export default function RiskAndFatigueAnalytics({ baseId }: RiskAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);

  // Simulated AI analysis based on schedule structure
  // In a real scenario, this would query backend endpoints that pass the current schedule to an LLM or heuristic engine
  useEffect(() => {
    let isMounted = true;
    if (baseId) {
      const loadParams = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (isMounted) {
          setRiskData({
            overallRisk: 'Alto', // Baixo, Médio, Alto
            fatigueScore: 78,    // 0-100
            recommendations: [
              "Evitar escalação sequencial do turno NOITE para agentes do setor X.",
              "Risco de quebra de regulamentação (RBAC) detectado no funcionário BP-459039.",
              "Cobertura crítica no dia 15/05 (Abaixo de 2 CAT-6 presentes)."
            ],
            criticalDays: ['12/05', '15/05', '20/05']
          });
          setLoading(false);
        }
      };

      setTimeout(() => {
        if (isMounted) loadParams();
      }, 0);
    }
    return () => { isMounted = false; };
  }, [baseId]);

  if (!baseId) return null;

  return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/40 relative overflow-hidden">
      <div className="absolute -top-4 -right-4 text-rose-500/10 dark:text-rose-500/5">
        <Activity size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-xl">
            <ShieldAlert className="text-rose-600 dark:text-rose-400" size={24} />
          </div>
          <h3 className="text-xl font-black text-rose-950 dark:text-rose-100 uppercase tracking-tighter">
            Análise Preditiva de Fadiga e Risco
          </h3>
          <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-1 rounded-full uppercase ml-auto">
            Powered by AI
          </span>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-rose-200/50 dark:bg-rose-800/50 rounded w-3/4"></div>
            <div className="h-4 bg-rose-200/50 dark:bg-rose-800/50 rounded w-1/2"></div>
            <div className="h-4 bg-rose-200/50 dark:bg-rose-800/50 rounded w-full"></div>
            <p className="text-xs font-bold text-rose-400 mt-4">Motor de IA analisando cruzamento de turnos...</p>
          </div>
        ) : riskData ? (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-black text-rose-800/60 dark:text-rose-200/60 uppercase tracking-widest mb-1">Score de Fadiga (FRMS)</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-rose-700 dark:text-rose-300 tracking-tighter">{riskData.fatigueScore}</span>
                  <span className="text-sm font-bold text-rose-600/60 dark:text-rose-400/60 mb-1">/100</span>
                </div>
              </div>
              
              <div className="h-12 w-px bg-rose-200 dark:bg-rose-800"></div>
              
              <div>
                <p className="text-[10px] font-black text-rose-800/60 dark:text-rose-200/60 uppercase tracking-widest mb-1">Status de Risco</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm font-bold uppercase tracking-tight">
                  <AlertTriangle size={14} />
                  {riskData.overallRisk}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-rose-800/60 dark:text-rose-200/60 uppercase tracking-widest mb-3">Insights Gerados</p>
              <ul className="space-y-2">
                {riskData.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm font-medium text-rose-950 dark:text-rose-100 bg-white/50 dark:bg-slate-900/30 p-3 rounded-xl border border-rose-100/50 dark:border-rose-900/20">
                    <ChevronRight size={16} className="text-rose-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
