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
import Tutorial from '@/components/Tutorial';

export default function ManagerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tutorial_seen_manager');
    if (!hasSeenTutorial) {
      setTimeout(() => setShowTutorial(true), 0);
    }
  }, []);

  const handleCloseTutorial = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('tutorial_seen_manager', 'true');
    }
    setShowTutorial(false);
  };

  const managerTutorialSteps = [
    { title: "Visão Estratégica do Gerente", description: "Bem-vindo. Aqui você acompanha a saúde operacional de todas as bases da LATAM em um único painel centralizado." },
    { title: "Matriz de Responsabilidade", description: "Identifique rapidamente bases críticas que estão sem supervisores ativos ou que necessitam de intervenção imediata." },
    { title: "Compliance e Eficiência", description: "Monitore o índice de conformidade das escalas com os padrões corporativos e a eficiência do motor de IA." },
    { title: "Avisos de Férias", description: "No botão 'Aviso de Férias', você pode designar supervisores interinos para garantir a continuidade operacional." }
  ];

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
        // Fetch current user
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
          setUser(userData || session.user);
        }

        // Fetch bases
        const { data: basesData } = await supabase.from('bases').select('*');
        const { data: usersData } = await supabase.from('users').select('name, base_id, roles').contains('roles', ['supervisor']);
        
        const enrichedBases = (basesData || []).map((b: any) => ({
            ...b,
            supervisor: usersData?.find((u: any) => u.base_id === b.id)?.name || 'N/A'
        }));
        setBases(enrichedBases);
        
        setStats({
            totalBases: basesData?.length || 0,
            basesWithIssues: enrichedBases.filter((b: any) => b.supervisor === 'N/A').length,
            avgCompliance: 96
        });
        setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* ... header igual ao anterior ... */}
      <div className="flex justify-end p-4">
        <button 
          onClick={() => setShowInterimModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all text-sm"
        >
          <ArrowRightLeft size={18} />
          Aviso de Férias
        </button>
      </div>
      
      {user && (
        <InterimRoleModal 
          isOpen={showInterimModal} 
          onClose={() => setShowInterimModal(false)}
          roleType="supervisor"
          currentUserId={user.id}
        />
      )}

      <Tutorial 
        role="manager"
        isOpen={showTutorial}
        steps={managerTutorialSteps}
        onClose={handleCloseTutorial}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Terminais Gerenciados" value={stats.totalBases} icon={<ShieldCheck className="text-emerald-600 dark:text-emerald-400"/>} />
        <StatCard title="Bases Críticas (Sem Sup)" value={stats.basesWithIssues} icon={<AlertCircle className="text-rose-600 dark:text-rose-400"/>} />
        <StatCard title="Compliance Geral" value={`${stats.avgCompliance}%`} icon={<TrendingUp className="text-indigo-600 dark:text-indigo-400"/>} />
      </div>

      {/* Relação de Bases e Supervisores (Tabela) */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6">Matriz de Responsabilidade (Base/Supervisor)</h3>
        <table className="w-full">
            <thead className="text-left text-slate-400 dark:text-slate-500 text-xs uppercase font-black">
                <tr>
                    <th className="pb-4">Base (IATA)</th>
                    <th className="pb-4">Supervisor</th>
                    <th className="pb-4">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {bases.map(b => (
                    <tr key={b.id} className="text-sm font-bold text-slate-900 dark:text-slate-200">
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
      
      {user && (
        <SuggestionSection 
            userId={user.id} 
            userName={user.name || user.email} 
            userRole={user.roles?.[0] || 'manager'} 
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center">{icon}</div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
      </div>
      <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
    </div>
  );
}
