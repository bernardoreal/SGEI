'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  TrendingUp, 
  FileText
} from 'lucide-react';
import { getMonthlyComplianceTrend } from '@/lib/manager-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    globalFeedbackTrend: 'Positivo',
    totalAuditLogs: 0,
    complianceScore: 98
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch data de forma paralela
      const [trend, { count: auditCount }] = await Promise.all([
        getMonthlyComplianceTrend(),
        supabase.from('audit_log').select('*', { count: 'exact', head: true })
      ]);
      
      setTrendData(trend);
      setStats({
        globalFeedbackTrend: 'Positivo',
        totalAuditLogs: auditCount || 0,
        complianceScore: 98
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cockpit Gerencial</h1>
        <p className="text-slate-500 font-medium">Visão estratégica, conformidade e auditoria corporativa.</p>
      </div>

      {/* KPIs Estratégicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Compliance Score" value={`${stats.complianceScore}%`} icon={<ShieldCheck className="text-emerald-600"/>} />
        <StatCard title="Fidelidade da IA" value={stats.globalFeedbackTrend} icon={<TrendingUp className="text-indigo-600"/>} />
        <StatCard title="Total Registros de Auditoria" value={stats.totalAuditLogs} icon={<FileText className="text-slate-600"/>} />
      </div>

      {/* Gráfico de Tendência */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Tendência Mensal de Conformidade (Feedback IA)</h3>
        <div className="h-64">
           {trendData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={trendData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Legend />
                 <Bar dataKey="boa" fill="#10b981" name="Escalas Aprovadas" />
                 <Bar dataKey="ruim" fill="#f43f5e" name="Escalas Questionadas" />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-400">Dados insuficientes para gerar tendência.</div>
           )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">{icon}</div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
    </div>
  );
}
