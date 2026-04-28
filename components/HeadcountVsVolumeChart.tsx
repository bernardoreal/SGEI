'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Line, Legend } from 'recharts';
import { Package, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface ChartProps {
  baseId: string;
}

export default function HeadcountVsVolumeChart({ baseId }: ChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadParams = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isMounted) {
        const mockData = Array.from({ length: 14 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dayStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          
          // Base headcount around 15, with some weekend dips
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const headcount = isWeekend ? Math.floor(Math.random() * 3) + 8 : Math.floor(Math.random() * 4) + 14;
          
          // Cargo volume in tons, peaking mid-week and end of month
          let volume = isWeekend ? Math.floor(Math.random() * 20) + 40 : Math.floor(Math.random() * 40) + 80;
          
          // Create an artificial bottleneck on day 5 (High volume, low headcount)
          if (i === 5) {
            volume = 120;
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
  }, [baseId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processando Modelo Preditivo (Malha vs Efetivo)...</p>
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
        
        {bottleneckDay && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 p-2 lg:px-4 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
            <span className="text-[10px] md:text-xs font-bold text-rose-800 dark:text-rose-300">
              Risco Operacional detectado: {bottleneckDay} (Possível Quebra de SLA)
            </span>
          </div>
        )}
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
