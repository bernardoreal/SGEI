'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Scale } from 'lucide-react';

export default function CostAnalyticsWidget({ scheduleId }: { scheduleId?: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching cost and compliance metrics for the current schedule
    setTimeout(() => {
      setData({
        estimatedOvertimeHours: 42,
        estimatedOvertimeCost: 'R$ 3.850,00',
        complianceScore: 94,
        status: 'warning', // good, warning, bad
        trend: 'down',
        alerts: [
          '3 agentes com previsão de ultrapassar o limite de hora extra se aprovados no swap.',
          'Economia de R$ 1.200 em HE comparado ao mês passado via realocação automatizada.'
        ]
      });
    }, 1000);
  }, [scheduleId]);

  if (!data) return (
    <div className="animate-pulse bg-slate-50 dark:bg-slate-800 h-48 rounded-[32px] w-full"></div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
            <DollarSign className="text-emerald-600 dark:text-emerald-400" size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            Análise de Custos e Compliance
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Previsão HE (Horas Extras)</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{data.estimatedOvertimeHours}h</h4>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{data.estimatedOvertimeCost}</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Compliance Legal (CLT/Convenção)</p>
          <div className="flex items-center gap-2">
            <Scale className={data.complianceScore > 90 ? "text-emerald-500" : "text-amber-500"} size={18} />
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{data.complianceScore}%</h4>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {data.alerts.map((alert: string, idx: number) => (
          <p key={idx} className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-start gap-2 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg">
            <TrendingDown size={14} className="text-slate-400 shrink-0 mt-0.5" />
            {alert}
          </p>
        ))}
      </div>
    </div>
  );
}
