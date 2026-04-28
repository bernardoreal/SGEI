'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Line, Legend } from 'recharts';
import { Package, Users, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';

import { supabase } from '@/lib/supabase';

interface ChartProps {
  baseId?: string;
}

export default function HeadcountVsVolumeChart({ baseId: initialBaseId }: ChartProps) {
  const [selectedBase, setSelectedBase] = useState(initialBaseId || 'GLOBAL');
  const [basesList, setBasesList] = useState<{id: string, name: string}[]>([
    { id: 'GLOBAL', name: 'Global (Todas)' }
  ]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronize state if parent changes baseId
  useEffect(() => {
    if (initialBaseId && initialBaseId !== 'GLOBAL') {
      setTimeout(() => setSelectedBase(initialBaseId), 0);
    }
  }, [initialBaseId]);

  // Load bases from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchBases = async () => {
      if (supabase) {
        const { data: dbBases, error } = await supabase.from('bases').select('id, code_iata, name').order('name');
        if (!error && dbBases && isMounted) {
          const formattedBases = dbBases.map(b => ({
            id: b.id,
            name: `${b.name} (${b.code_iata})`,
          }));
          setBasesList([
            { id: 'GLOBAL', name: 'Global (Todas)' },
            ...formattedBases
          ]);
        }
      }
    };
    fetchBases();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadParams = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isMounted) {
        // Identify base and multiplier
        const currentBaseObj = basesList.find(b => b.id === selectedBase);
        const codeMatcher = currentBaseObj?.name.match(/\(([^)]+)\)/);
        const code = codeMatcher ? codeMatcher[1] : '';
        const multiplier = selectedBase === 'GLOBAL' ? 5 : (code === 'GRU' || code === 'VCP' ? 2 : 1);
        
        const mockData = Array.from({ length: 14 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dayStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          
          // Base headcount around 15, with some weekend dips
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const bgm = Math.floor(Math.random() * 3);
          const hcRand = Math.floor(Math.random() * 4);
          
          const headcount = (isWeekend ? bgm + 8 : hcRand + 14) * multiplier;
          
          // Cargo volume in tons, peaking mid-week and end of month
          const volRandWk = Math.floor(Math.random() * 20);
          const volRandWd = Math.floor(Math.random() * 40);
          
          let volume = (isWeekend ? volRandWk + 40 : volRandWd + 80) * multiplier;
          
          // Create an artificial bottleneck on day 5 (High volume, low headcount)
          if (i === 5) {
            volume = 120 * multiplier;
          }

          const efficiencyRatio = volume / headcount; // Tons per person

          return {
            date: dayStr,
            headcount: headcount,
            volume: volume,
            efficiency: efficiencyRatio.toFixed(1),
            bottleneck: i === 5,
          };
        });
        
        setData(mockData);
        setLoading(false);
      }
    };
    
    setTimeout(() => {
      if (isMounted) loadParams();
    }, 0);

    return () => { isMounted = false; };
  }, [selectedBase, basesList]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processando Modelo Preditivo (Malha vs Efetivo) - {selectedBase}...</p>
        </div>
      </div>
    );
  }

  const bottleneckDay = data.find(d => d.bottleneck)?.date;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl">
            <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              A.I. Forecast: Headcount Operacional vs. Malha (Toneladas)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Capacidade de processamento do TECA vs. Volume de Carga Previsto (14 Dias)
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {bottleneckDay && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 p-2 px-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="text-[10px] md:text-xs font-bold text-rose-800 dark:text-rose-300">
                Risco: {bottleneckDay}
              </span>
            </div>
          )}
          
          <div className="relative">
            <select
              value={selectedBase}
              onChange={(e) => setSelectedBase(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            >
              {basesList.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
              dy={10}
            />
            <YAxis 
              yAxisId="left" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
              label={{ value: 'Headcount', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fontWeight: 'bold', fill: '#64748b' } }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
              label={{ value: 'Toneladas (Carga)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '10px', fontWeight: 'bold', fill: '#64748b' } }}
            />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
              itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 900 }}
              formatter={(value, name) => {
                if (name === 'volume') return [`${value} Toneladas`, 'Previsão de Carga'];
                if (name === 'headcount') return [`${value} Agentes`, 'Efetivo Escalado'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
            
            <Bar yAxisId="left" dataKey="headcount" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Efetivo Escalado" barSize={20} />
            <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} name="Previsão de Carga" />
            
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Headcount Ótimo: ~14</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500"></div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Pico Malha: &gt; 100 Ton</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ton/Agente Média: 4.5</span>
        </div>
      </div>
    </div>
  );
}
