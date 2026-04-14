'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  Users, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SuggestionSection from '@/components/SuggestionSection';
import LATAMScheduleTable from '@/components/LATAMScheduleTable';

export default function CoordinatorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bases, setBases] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalBases: 0,
    pendingRequests: 0,
    publishedSchedules: 0
  });
  const [selectedBase, setSelectedBase] = useState<any | null>(null);
  const [baseDetails, setBaseDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      // 0. Fetch Current User
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(userData);
      }

      // 1. Fetch Bases
      const { data: basesData, error: basesError } = await supabase
        .from('bases')
        .select('*')
        .order('name', { ascending: true });
      
      if (basesError) throw basesError;

      // 2. Fetch Stats for each base
      const basesWithStats = await Promise.all((basesData || []).map(async (base) => {
        // Count employees
        const { count: empCount } = await supabase
          .from('base_employees')
          .select('*', { count: 'exact', head: true })
          .eq('base_id', base.id)
          .eq('is_active', true);

        // Count pending requests
        const { count: reqCount } = await supabase
          .from('shift_requests')
          .select('*', { count: 'exact', head: true })
          .eq('base_id', base.id)
          .eq('status', 'pendente');

        // Check latest schedule status
        const { data: latestSchedule } = await supabase
          .from('schedules')
          .select('*')
          .eq('base_id', base.id)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...base,
          employeeCount: empCount || 0,
          pendingRequests: reqCount || 0,
          latestSchedule: latestSchedule || null,
          status: latestSchedule ? (latestSchedule.published_at ? 'published' : 'draft') : 'none'
        };
      }));

      setBases(basesWithStats);

      // 3. Aggregate Global Stats
      const totalEmp = basesWithStats.reduce((acc: number, b: any) => acc + b.employeeCount, 0);
      const totalPending = basesWithStats.reduce((acc: number, b: any) => acc + b.pendingRequests, 0);
      const totalPublished = basesWithStats.filter(b => b.status === 'published').length;

      setStats({
        totalEmployees: totalEmp,
        totalBases: basesWithStats.length,
        pendingRequests: totalPending,
        publishedSchedules: totalPublished
      });

    } catch (err) {
      console.error('Error fetching coordinator data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseDetails = async (base: any) => {
    setSelectedBase(base);
    setLoadingDetails(true);
    try {
      // Fetch employees for this base
      const { data: employees } = await supabase
        .from('base_employees')
        .select('*')
        .eq('base_id', base.id)
        .eq('is_active', true);

      // Fetch latest schedule details if published
      let scheduleData = null;
      if (base.latestSchedule && base.latestSchedule.published_at) {
        const { data: details } = await supabase
          .from('schedule_details')
          .select('*, base_employees(name, bp)')
          .eq('schedule_id', base.latestSchedule.id)
          .order('date', { ascending: true });
        
        if (details && details.length > 0) {
          const groupedData = details.reduce((acc: any, detail: any) => {
            const bp = detail.bp;
            if (!acc[bp]) {
              const emp = employees?.find(e => e.bp === bp);
              acc[bp] = {
                area: "OPERAÇÃO",
                turno: detail.shift === 'manhã' ? 'MANHÃ' : 'TARDE',
                bp: bp,
                funcao: emp?.cargo || emp?.position || 'AUXILIAR',
                nome: emp?.name || detail.base_employees?.name || 'Desconhecido',
                days: []
              };
            }
            acc[bp].days.push({
              date: new Date(detail.date + 'T12:00:00Z').getUTCDate().toString().padStart(2, '0') + '/' + (new Date(detail.date + 'T12:00:00Z').getUTCMonth() + 1).toString().padStart(2, '0'),
              code: detail.code || (detail.status === 'folga' ? 'FOLG' : 'T000')
            });
            return acc;
          }, {});

          scheduleData = {
            ...base.latestSchedule,
            data: Object.values(groupedData)
          };
        }
      }

      setBaseDetails({
        employees: employees || [],
        schedule: scheduleData
      });

    } catch (err) {
      console.error('Error fetching base details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredBases = bases.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.code_iata.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-latam-indigo border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Carregando visão consolidada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Visão Consolidada</h1>
          <p className="text-slate-500 font-medium">Monitoramento de escalas e performance em todas as bases.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => fetchGlobalData()}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-latam-indigo transition-all"
            title="Atualizar Dados"
          >
            <Clock size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Bases" 
          value={stats.totalBases} 
          icon={<MapPin className="text-indigo-600" />} 
          color="bg-indigo-50"
        />
        <StatCard 
          title="Colaboradores" 
          value={stats.totalEmployees} 
          icon={<Users className="text-emerald-600" />} 
          color="bg-emerald-50"
        />
        <StatCard 
          title="Escalas Publicadas" 
          value={stats.publishedSchedules} 
          icon={<Calendar className="text-blue-600" />} 
          color="bg-blue-50"
          subtitle={`${bases.length - stats.publishedSchedules} pendentes`}
        />
        <StatCard 
          title="Solicitações Pendentes" 
          value={stats.pendingRequests} 
          icon={<AlertCircle className="text-amber-600" />} 
          color="bg-amber-50"
          alert={stats.pendingRequests > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bases List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Terminais</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar base..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredBases.map((base) => (
                <button
                  key={base.id}
                  onClick={() => fetchBaseDetails(base)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                    selectedBase?.id === base.id 
                      ? 'bg-indigo-50 border-indigo-100 shadow-sm' 
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                      base.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {base.code_iata}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{base.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{base.employeeCount} colaboradores</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {base.pendingRequests > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {base.pendingRequests} REQ
                      </span>
                    )}
                    <ChevronRight size={16} className={selectedBase?.id === base.id ? 'text-indigo-600' : 'text-slate-300'} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Base Details / Dashboard */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedBase ? (
              <motion.div
                key={selectedBase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Base Header Card */}
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <MapPin size={120} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-latam-indigo text-white px-4 py-2 rounded-xl font-black text-xl">
                        {selectedBase.code_iata}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedBase.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${selectedBase.status === 'published' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {selectedBase.status === 'published' ? 'Escala Publicada' : 'Sem Escala Ativa'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efetivo</p>
                        <p className="text-xl font-black text-slate-900">{selectedBase.employeeCount}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trocas Pendentes</p>
                        <p className="text-xl font-black text-slate-900">{selectedBase.pendingRequests}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Atualização</p>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedBase.latestSchedule?.published_at 
                            ? new Date(selectedBase.latestSchedule.published_at).toLocaleDateString('pt-BR') 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule View */}
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Escala Operacional</h3>
                    {baseDetails?.schedule && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-full">
                          {baseDetails.schedule.month} {baseDetails.schedule.year}
                        </span>
                      </div>
                    )}
                  </div>

                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-medium">Carregando detalhes da base...</p>
                    </div>
                  ) : baseDetails?.schedule ? (
                    <div className="overflow-x-auto custom-scrollbar">
                      <LATAMScheduleTable 
                        data={baseDetails.schedule.data}
                        month={baseDetails.schedule.month}
                        year={baseDetails.schedule.year}
                        onDataChange={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <Calendar size={48} className="text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold uppercase tracking-tight">Nenhuma escala publicada para esta base</p>
                      <p className="text-slate-400 text-sm mt-1">O supervisor ainda não publicou a escala do mês.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-[32px] border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                  <LayoutDashboard size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Selecione uma Base</h3>
                <p className="text-slate-500 max-w-sm">
                  Escolha um terminal na lista ao lado para visualizar o status das escalas, efetivo e solicitações em tempo real.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sugestões de Melhoria */}
      <SuggestionSection 
        userId={user?.id} 
        userName={user?.name} 
        userRole={user?.roles?.[0] || 'coordinator'} 
      />
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle, alert }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
          {icon}
        </div>
        {alert && (
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
          {subtitle && <span className="text-xs font-bold text-slate-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
