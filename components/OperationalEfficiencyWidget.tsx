'use client';

import { useState, useEffect } from 'react';
import { Target, Clock, ShieldCheck, Zap, TrendingDown, ArrowUpRight } from 'lucide-react';

interface EfficiencyProps {
  level: 'manager' | 'coordinator' | 'admin';
}

export default function OperationalEfficiencyWidget({ level }: EfficiencyProps) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadParams = async () => {
      // Simulating aggregation of AI savings and operational KPIs
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (isMounted) {
        setData({
          roi: {
            savedOvertime: 'R$ 45.200',
            savedHours: 850,
            percentageDrop: 14,
          },
          absenteeism: {
            rate: '3.2%',
            trend: 'down',
            benchmark: '5%'
          },
          sla: {
            projected: '98.5%',
            current: '96.2%',
            riskEvents: 2
          },
          aiInterventions: 142
        });
      }
    };
    
    setTimeout(() => {
      if (isMounted) loadParams();
    }, 0);

    return () => { isMounted = false; };
  }, [level]);

  if (!data) return (
    <div className="animate-pulse bg-slate-50 dark:bg-slate-800 h-64 rounded-[32px] w-full"></div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 lg:p-8 rounded-[32px] relative overflow-hidden group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-700 group-hover:bg-emerald-500/10"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-500/30 p-2.5 rounded-xl">
              <Target className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                Impacto da Inteligência Artificial & ROI Global
              </h3>
              <p className="text-xs font-medium text-slate-400">Acumulado da Malha (Saving em R$ e Melhoria Operacional)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
          {/* Card 1: ROI HE */}
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Economia (HE) Evitada</p>
              <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                <TrendingDown size={14} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <h4 className="text-3xl font-black text-white tracking-tighter">{data.roi.savedOvertime}</h4>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <ArrowUpRight size={12} className="rotate-90" /> {data.roi.percentageDrop}% vs Mês Anterior
              </p>
            </div>
          </div>

          {/* Card 2: SLA Projection */}
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Projeção SLA de Conexão</p>
              <div className="bg-indigo-500/20 p-1.5 rounded-lg">
                <ShieldCheck size={14} className="text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-end gap-2">
                <h4 className="text-3xl font-black text-white tracking-tighter">{data.sla.projected}</h4>
                <p className="text-xs font-bold text-slate-500 mb-1 line-through">{data.sla.current}</p>
              </div>
              <p className="text-xs font-bold text-indigo-400 mt-1">Escalas otimizadas (Prevenção)</p>
            </div>
          </div>

          {/* Card 3: Absenteeism */}
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Taxa Absenteísmo (Fadiga)</p>
              <div className="bg-sky-500/20 p-1.5 rounded-lg">
                <Clock size={14} className="text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-end gap-2">
                <h4 className="text-3xl font-black text-white tracking-tighter">{data.absenteeism.rate}</h4>
              </div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                Abaixo do benchmark de {data.absenteeism.benchmark}
              </p>
            </div>
          </div>

          {/* Card 4: AI Actions */}
          <div className="bg-indigo-600 p-5 rounded-2xl border border-indigo-500 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-4 -right-2 text-indigo-500/50">
              <Zap size={80} />
            </div>
            <div className="relative z-10 flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-tight">Prevenções Autônomas A.I.</p>
            </div>
            <div className="relative z-10">
              <h4 className="text-4xl font-black text-white tracking-tighter">{data.aiInterventions}</h4>
              <p className="text-xs font-bold text-indigo-200 mt-1">Gaps e riscos resolvidos no mês</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
