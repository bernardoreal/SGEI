'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Filter, Clock, Activity, AlertTriangle, Users } from 'lucide-react';

interface NativeHoursAnalyticsProps {
  role: 'manager' | 'coordinator' | 'supervisor';
  userBaseId?: string;
}

export default function NativeHoursAnalytics({ role, userBaseId }: NativeHoursAnalyticsProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bases, setBases] = useState<any[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>('all');
  
  const isGlobalView = (role === 'manager' || role === 'coordinator') && selectedBase === 'all';

  useEffect(() => {
    if (role === 'manager' || role === 'coordinator') {
      fetchBases();
    }
  }, [role]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData();
  }, [selectedBase, userBaseId, role, bases]); // Added bases to dependency to ensure it runs when bases load

  const fetchBases = async () => {
    const { data: basesData } = await supabase.from('bases').select('id, name, code_iata');
    if (basesData) setBases(basesData);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const targetBaseId = role === 'supervisor' ? userBaseId : (selectedBase !== 'all' ? selectedBase : null);

      if (targetBaseId) {
        // View por Colaborador dentro de uma base específica
        const { data: schedules } = await supabase.from('schedules').select('id, month, year').eq('base_id', targetBaseId);
        const scheduleIds = schedules?.map((s: any) => s.id) || [];
        
        if (scheduleIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const { data: details } = await supabase
          .from('schedule_details')
          .select('bp, shift, base_employees(name)')
          .in('schedule_id', scheduleIds);

        const agg: Record<string, any> = {};
        details?.forEach((d: any) => {
          if (d.shift && d.shift.toUpperCase() !== 'FOLGA') {
            if (!agg[d.bp]) agg[d.bp] = { bp: d.bp, name: (d.base_employees as any)?.name || d.bp, horas: 0 };
            agg[d.bp].horas += 6; // Estimativa média de 6h por turno produtivo (considerando parciais e cheios no 5x1)
          }
        });
        
        // Pick names (first name + last name) for better UI display
        const chartData = Object.values(agg).map(item => {
           let displayName = item.name;
           if (typeof displayName === 'string' && displayName.includes(' ')) {
             const parts = displayName.trim().split(' ');
             displayName = `${parts[0]} ${parts[parts.length - 1]}`;
           }
           return { ...item, name: displayName };
        }).sort((a:any, b:any) => b.horas - a.horas);
        
        setData(chartData);

      } else {
        // View Global: Horas por Base (Gerente / Coordenador)
        if (bases.length === 0) return; // Aguarda carregar bases

        const { data: schedules } = await supabase.from('schedules').select('id, base_id');
        const scheduleIds = schedules?.map((s: any) => s.id) || [];
        
        if (scheduleIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const { data: details } = await supabase
          .from('schedule_details')
          .select('schedule_id, shift')
          .in('schedule_id', scheduleIds);

        // Mapeia base_id
        const scheduleToBase: Record<string, string> = {};
        schedules?.forEach((s: any) => scheduleToBase[s.id] = s.base_id);

        const agg: Record<string, any> = {};
        details?.forEach((d: any) => {
          const baseId = scheduleToBase[d.schedule_id];
          if (baseId && d.shift && d.shift.toUpperCase() !== 'FOLGA') {
            if (!agg[baseId]) agg[baseId] = { baseId, horas: 0 };
            agg[baseId].horas += 6;
          }
        });

        // Get employee counts per base
        const { data: baseEmployees } = await supabase.from('base_employees').select('base_id');
        const empCounts: Record<string, number> = {};
        baseEmployees?.forEach((emp: any) => {
          const baseId = emp.base_id;
          if (baseId) {
             empCounts[baseId] = (empCounts[baseId] || 0) + 1;
          }
        });

        // Junta com nome da base
        const finalData = bases.map(b => ({
          name: b.code_iata,
          horas: agg[b.id]?.horas || 0,
          empCount: empCounts[b.id] || 0
        })).filter(b => b.horas > 0).sort((a, b) => b.horas - a.horas);

        setData(finalData);
      }

    } catch (error) {
      console.error("Erro ao buscar horas das escalas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
            <Clock className="text-indigo-600" />
            {role === 'supervisor' ? 'Horas por Colaborador' : 'Visão Estratégica de Horas'}
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {role === 'supervisor' 
              ? 'Distribuição do esforço operacional na sua base.' 
              : 'Monitoramento de recursos e tomada de decisão instantânea baseado nos dados sistêmicos.'}
          </p>
        </div>

        {(role === 'manager' || role === 'coordinator') && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 w-full md:w-auto">
            <Filter size={16} className="text-slate-400 ml-2" />
            <select 
              className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none w-full"
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
            >
              <option value="all">Todas as Bases (Visão Global)</option>
              {bases.map(b => (
                <option key={b.id} value={b.id}>Apenas Base {b.code_iata}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="h-[400px] w-full">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium tracking-tight">Processando métricas...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
            <Activity className="text-slate-300 mb-2" size={32} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Sem dados suficientes</p>
            <p className="text-slate-400 text-sm mt-1">As bases necessitam de escalas ativas publicadas para o cômputo.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                dy={10}
                interval={0}
                angle={isGlobalView ? 0 : -45}
                textAnchor={isGlobalView ? 'middle' : 'end'}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value} Hrs`, 'Esforço (Mensal)']}
              />
              <Bar 
                dataKey="horas" 
                fill="#4f46e5" 
                radius={[6, 6, 0, 0]} 
                barSize={isGlobalView ? 40 : 25}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && data.length > 0 && (
        <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-slate-400" />
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Detalhamento para Controle</h4>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{isGlobalView ? 'Base' : 'Colaborador'}</th>
                  {!isGlobalView && <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">BP</th>}
                  {isGlobalView && <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Colaboradores Totais</th>}
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Horas</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {data.map((row, idx) => {
                  const isOvertimeAlert = isGlobalView ? row.horas / (row.empCount || 1) > 180 : row.horas > 180;
                  const isCritical = isGlobalView ? row.horas / (row.empCount || 1) > 200 : row.horas > 200;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">{row.name}</td>
                      {!isGlobalView && <td className="py-3 px-4 text-sm text-slate-500 font-mono">{row.bp}</td>}
                      {isGlobalView && <td className="py-3 px-4 text-sm text-slate-600 font-medium">{row.empCount || 'N/A'}</td>}
                      <td className="py-3 px-4 text-sm font-black text-indigo-600 dark:text-indigo-400">{row.horas}h</td>
                      <td className="py-3 px-4">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle size={14} /> Alto Risco de HE
                          </span>
                        ) : isOvertimeAlert ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle size={14} /> Perto do Limite
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Activity size={14} /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
