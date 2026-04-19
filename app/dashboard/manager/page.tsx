'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  TrendingUp, 
  FileText,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';
import { getMonthlyComplianceTrend } from '@/lib/manager-analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import SuggestionSection from '@/components/SuggestionSection';
import InterimRoleModal from '@/components/InterimRoleModal';

export default function ManagerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [bases, setBases] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBases: 0,
    basesWithIssues: 0,
    avgCompliance: 0
  });
  const [loading, setLoading] = useState(true);
  const [showInterimModal, setShowInterimModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
        setLoading(true);
        // ... busca bases, supervisores e status
        const { data: basesData } = await supabase.from('bases').select('*');
        const { data: usersData } = await supabase.from('users').select('name, base_id, roles').contains('roles', ['supervisor']);
        
        const enrichedBases = (basesData || []).map((b: any) => ({
            ...b,
            supervisor: usersData?.find((u: any) => u.base_id === b.id)?.name || 'N/A'
        }));
        setBases(enrichedBases);
        
        setStats({
            totalBases: basesData?.length || 0,
            basesWithIssues: enrichedBases.filter(b => b.supervisor === 'N/A').length,
            avgCompliance: 96
        });
        setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* ... header igual ao anterior ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Terminais Gerenciados" value={stats.totalBases} icon={<ShieldCheck className="text-emerald-600"/>} />
        <StatCard title="Bases Críticas (Sem Sup)" value={stats.basesWithIssues} icon={<AlertCircle className="text-rose-600"/>} />
        <StatCard title="Compliance Geral" value={`${stats.avgCompliance}%`} icon={<TrendingUp className="text-indigo-600"/>} />
      </div>

      {/* Relação de Bases e Supervisores (Tabela) */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Matriz de Responsabilidade (Base/Supervisor)</h3>
        <table className="w-full">
            <thead className="text-left text-slate-400 text-xs uppercase font-black">
                <tr>
                    <th className="pb-4">Base (IATA)</th>
                    <th className="pb-4">Supervisor</th>
                    <th className="pb-4">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {bases.map(b => (
                    <tr key={b.id} className="text-sm font-bold text-slate-900">
                        <td className="py-4">{b.code_iata}</td>
                        <td className="py-4">{b.supervisor}</td>
                        <td className="py-4">
                            <span className={b.supervisor === 'N/A' ? "text-rose-600" : "text-emerald-600"}>
                                {b.supervisor === 'N/A' ? 'AÇÃO NECESSÁRIA' : 'OPERACIONAL'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      {/* ... Gráfico de Tendência e Sugestões ... */}
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
