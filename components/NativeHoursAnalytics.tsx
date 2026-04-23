'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Clock, Activity, AlertTriangle, Users } from 'lucide-react';
import { getLookerGlobalData, getLookerEmployeesByBase } from '@/lib/lookerData';

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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Encontrar o código IATA da base alvo para carregar os empregados do Looker
        let targetIata = '';
        if (targetBaseId === selectedBase) {
           targetIata = bases.find(b => b.id === targetBaseId)?.code_iata || '';
        } else {
           const { data: bData } = await supabase.from('bases').select('code_iata').eq('id', targetBaseId).single();
           targetIata = bData?.code_iata || '';
        }

        if (targetIata) {
          const empData = getLookerEmployeesByBase(targetIata);
          setData(empData);
        } else {
          setData([]);
        }
      } else {
        // View Global: Horas por Base (Gerente / Coordenador)
        if (bases.length === 0) return; // Aguarda carregar bases

        const globalData = getLookerGlobalData();
        const finalData = bases.map(b => {
          const lookerStats = globalData[b.code_iata];
          const empList = getLookerEmployeesByBase(b.code_iata);
          return {
            name: b.code_iata,
            horas: lookerStats?.autorizadas || 0,
            executadas: lookerStats?.realizado || 0,
            empCount: empList.length || 0
          };
        }).filter(b => b.horas > 0 || b.executadas > 0).sort((a, b) => b.executadas - a.executadas);

        setData(finalData);
      }

    } catch (error) {
      console.error("Erro ao buscar horas das escalas vs looker:", error);
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
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                formatter={(value: any, name: any) => {
                  if (name === 'horas') return [`${value} Hrs`, 'Planejado'];
                  if (name === 'executadas') return [`${value} Hrs`, 'Executado (Registrado)'];
                  return [`${value} Hrs`, name];
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => {
                   return <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{value === 'horas' ? 'Planejado (Escala)' : 'Realizado (Ponto)'}</span>
                }}
              />
              <Bar 
                dataKey="horas" 
                name="horas"
                fill="#cbd5e1" 
                radius={[6, 6, 0, 0]} 
                barSize={isGlobalView ? 20 : 15}
                animationDuration={1500}
              />
              <Bar 
                dataKey="executadas" 
                name="executadas"
                fill="#1B0088" 
                radius={[6, 6, 0, 0]} 
                barSize={isGlobalView ? 20 : 15}
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hrs Planejadas</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hrs Executadas</th>
                  {!isGlobalView && <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ocorrências</th>}
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {data.map((row, idx) => {
                  // Alerts baseados no executado (horas reais de fechamento)
                  const baseAvg = isGlobalView ? row.executadas / (row.empCount || 1) : row.executadas;
                  const isOvertimeAlert = baseAvg > 180;
                  const isCritical = baseAvg > 200;
                  const isMissing = baseAvg < (isGlobalView ? (row.horas / (row.empCount||1)) - 10 : row.horas - 10);
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">{row.name}</td>
                      {!isGlobalView && <td className="py-3 px-4 text-sm text-slate-500 font-mono">{row.bp}</td>}
                      {isGlobalView && <td className="py-3 px-4 text-sm text-slate-600 font-medium">{row.empCount || 'N/A'}</td>}
                      <td className="py-3 px-4 text-sm font-bold text-slate-400 dark:text-slate-500">{row.horas}h</td>
                      <td className="py-3 px-4 text-sm font-black text-indigo-600 dark:text-indigo-400">{row.executadas}h</td>
                      {!isGlobalView && (
                         <td className="py-3 px-4">
                           <div className="flex flex-col gap-1 items-start">
                              {row.intra > 0 && <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-latam-crimson/10 text-latam-crimson border border-latam-crimson/20">INTRA ({row.intra})</span>}
                              {row.inter > 0 && <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">INTER ({row.inter})</span>}
                              {row.hrs2 > 0 && <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">+2HRS ({row.hrs2})</span>}
                              {(!row.intra && !row.inter && !row.hrs2) && <span className="text-xs text-slate-300">-</span>}
                           </div>
                         </td>
                      )}
                      <td className="py-3 px-4">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle size={14} /> Alto Risco HE (+200h)
                          </span>
                        ) : isOvertimeAlert ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle size={14} /> HE Perto do Limite
                          </span>
                        ) : isMissing ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Activity size={14} /> Faltas Computadas
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
