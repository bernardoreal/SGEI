'use client';

import { ShieldCheck, Clock, User, TrendingDown, TrendingUp, Search } from 'lucide-react';

export default function ForensicAuditLog() {
  const auditLogs = [
    {
      id: 'L00921',
      date: '28/04 • 12:45',
      user: 'Coordenador SILVA_M',
      action: 'Alteração Manual de Turno',
      target: 'BP-9921 (Mariana Costa)',
      detail: 'Removeu FOLG (Folga) do dia 15/05, inseriu T074 (08h-16h).',
      costImpact: '+ HE 100% (R$ 180,00)',
      costType: 'increase',
    },
    {
      id: 'L00920',
      date: '28/04 • 09:12',
      user: 'IA Resolutiva (Self-Healing)',
      action: 'Substituição Automática',
      target: 'BP-8812 (Carlos Silva)',
      detail: 'Acionado turno T128 (14h-22h) para suprir ausência inesperada de BP-1122.',
      costImpact: 'Custo Neutro (0 HE)',
      costType: 'neutral',
    },
    {
      id: 'L00919',
      date: '27/04 • 23:30',
      user: 'Admin ALMEIDA_J',
      action: 'Modificação de Configuração',
      target: 'Base GRU',
      detail: 'Alterado min_cat6 de 2 para 4 no turno madrugada.',
      costImpact: 'Reavaliação Sistêmica',
      costType: 'neutral',
    },
    {
      id: 'L00918',
      date: '26/04 • 15:20',
      user: 'Supervisor REAL_B',
      action: 'Aprovação de Escala (Override)',
      target: 'Escala MENSAL - MAIO 2026',
      detail: 'Publicou proposta IA alterando 2 turnos manualmente antes de assinar.',
      costImpact: '- R$ 45,00 vs IA Plan',
      costType: 'decrease',
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <ShieldCheck size={20} className="text-emerald-500" />
          <h3 className="font-bold uppercase tracking-wide">Auditoria Forense (Time-Travel)</h3>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
          <Search size={14} className="text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {auditLogs.map(log => (
          <div key={log.id} className="relative pl-6 pb-4 border-l-2 border-slate-100 dark:border-slate-800 last:pb-0 last:border-0 group">
            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 mb-1 font-mono">{log.id} • {log.date}</p>
                <div className="flex items-center gap-1.5 mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <User size={14} className="text-indigo-400" />
                  {log.user}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-1 pl-5">
                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">{log.action}</span>
                  {log.target}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 leading-relaxed">
                  {log.detail}
                </p>
              </div>
              
              <div className="text-right whitespace-nowrap pt-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded ${
                  log.costType === 'increase' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                  log.costType === 'decrease' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {log.costType === 'increase' && <TrendingUp size={10} />}
                  {log.costType === 'decrease' && <TrendingDown size={10} />}
                  {log.costImpact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-center">
        <button className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1 transition-colors">
          <Clock size={14} /> Carregar Histórico Trabalhista Anteriores
        </button>
      </div>
    </div>
  );
}
