'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  ArrowLeft,
  Filter,
  Lock,
  Globe,
  RadioTower,
  ServerCrash
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SecurityCenterPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [mockLogs, setMockLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const fetchSecurityLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          id, action, table_name, record_id, created_at, old_data, new_data,
          users ( id, name, email, bp )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching logs:', error);
      } else if (data) {
        setLogs(data);
      }
    } catch (e) {
      console.error('Exception fetching logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
    
    // Subscribe to realtime security logs
    const channel = supabase.channel('audit_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 200));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSecurityLogs();
  };

  const getLogSeverity = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('UNAUTHORIZED') || act.includes('FORBIDDEN') || act.includes('ATTACK')) return 'critical';
    if (act.includes('UPDATE') || act.includes('FAILED')) return 'warning';
    return 'info';
  };

  // Basic mock enrichment for UI purposes (as standard audit_log might not have pure security actions yet)
  const enrichedLogs = useMemo(() => {
    return [...mockLogs, ...logs].map(log => {
      // If it's a generic audit log, try to map it to a security context
      let securityAction = log.action;
      let severity = getLogSeverity(log.action);
      let eventName = "Ação de Sistema";
      
      if (securityAction === 'INSERT') eventName = "Dados Inseridos";
      if (securityAction === 'UPDATE') eventName = "Alteração de Registros";
      if (securityAction === 'DELETE') eventName = "Remoção Definitiva";
      if (securityAction.includes('UNAUTHORIZED')) eventName = "Tentativa de Acesso Negada";

      // Mocking some "unauthorized" data just for demonstration of the dashboard if there are none
      // In production, the middleware should explicitly log 'UNAUTHORIZED' actions
      return {
        ...log,
        securityAction,
        severity,
        eventName,
        user: log.users || { name: log.users?.name || 'Sistema / Desconhecido', email: log.users?.email || 'N/A' },
        timestamp: new Date(log.created_at).toLocaleString('pt-BR')
      };
    }).filter(log => {
      if (filterType === 'ALL') return true;
      if (filterType === 'CRITICAL') return log.severity === 'critical';
      if (filterType === 'WARNING') return log.severity === 'warning';
      return log.securityAction === filterType;
    }).filter(log => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return log.eventName.toLowerCase().includes(lower) || 
             log.user.name?.toLowerCase().includes(lower) ||
             log.user.email?.toLowerCase().includes(lower);
    });
  }, [logs, mockLogs, filterType, searchTerm]);

  const criticalCount = [...mockLogs, ...logs].filter(l => getLogSeverity(l.action) === 'critical').length;
  const warningCount = [...mockLogs, ...logs].filter(l => getLogSeverity(l.action) === 'warning').length;

  const simulateAttack = () => {
    const newMockLog = {
      id: `mock-${Date.now()}`,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      table_name: 'Painel Gerencial / Coordenador',
      created_at: new Date().toISOString(),
      old_data: {},
      new_data: {},
      users: { name: 'Acesso Externo Anônimo', email: 'IP: 189.' + Math.floor(Math.random() * 255) + '.x.x' }
    };
    setMockLogs(prev => [newMockLog, ...prev]);
  };

  const clearSimulations = () => {
    setMockLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 p-4 sm:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition-colors mb-3">
              <ArrowLeft size={16} /> Voltar ao Painel Administrativo
            </Link>
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
              <ShieldAlert className="text-rose-600 dark:text-rose-500" size={32} /> 
              Security Center
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Monitoramento de vulnerabilidades, tentativas de acesso e eventos críticos.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 pr-4 pl-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            <button 
              onClick={simulateAttack}
              className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-400 font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <AlertTriangle size={12} /> Testar Invasão
            </button>
            {mockLogs.length > 0 && (
              <button 
                onClick={clearSimulations}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 font-bold px-3 py-1.5 rounded-full transition-colors"
              >
                Limpar Testes
              </button>
            )}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className={`w-3 h-3 rounded-full ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} ml-1`}></div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {criticalCount > 0 ? 'Alerta Ativo' : 'Sistema Seguro'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Eventos Críticos" 
            value={criticalCount.toString()} 
            icon={<AlertTriangle size={24} />} 
            trend="Últimas 24h"
            color="rose"
            highlight={criticalCount > 0}
          />
          <StatCard 
            title="Avisos (Warnings)" 
            value={warningCount.toString()} 
            icon={<ShieldAlert size={24} />} 
            trend="Monitore"
            color="amber"
          />
          <StatCard 
            title="Acessos Bloqueados" 
            value="--" 
            icon={<Lock size={24} />} 
            trend="WAF / RBAC"
            color="indigo"
          />
          <StatCard 
            title="Status da Rede" 
            value="Ativa" 
            icon={<RadioTower size={24} />} 
            trend="Monitoramento"
            color="emerald"
          />
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                <Activity size={20} />
              </div>
              <h2 className="text-xl font-bold">Log de Eventos de Segurança</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar logs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 w-full outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              
              <div className="relative shrink-0">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 w-full appearance-none outline-none cursor-pointer font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">Todos os Eventos</option>
                  <option value="CRITICAL">Apenas Críticos</option>
                  <option value="WARNING">Apenas Warnings</option>
                </select>
              </div>

              <button 
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-bold disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Nível</th>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Usuário / Ator</th>
                  <th className="px-6 py-4">Evento</th>
                  <th className="px-6 py-4">Tabela/Alvo</th>
                  <th className="px-6 py-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300 font-medium">
                {loading && !refreshing ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-4 text-rose-500" />
                      <p>Carregando eventos de segurança...</p>
                    </td>
                  </tr>
                ) : enrichedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <ShieldCheck size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-400">Nenhum evento registrado</p>
                      <p className="text-sm">A lista de monitoramento está vazia para os filtros atuais.</p>
                    </td>
                  </tr>
                ) : (
                  enrichedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                      <td className="px-6 py-4">
                        {log.severity === 'critical' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                            <ServerCrash size={12} /> CRITICAL
                          </span>
                        ) : log.severity === 'warning' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                            <AlertTriangle size={12} /> WARN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Activity size={12} /> INFO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                            {log.user.name ? log.user.name.substring(0,2) : '?'}
                          </div>
                          <span className="truncate max-w-[150px]">{log.user.name || log.user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{log.eventName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{log.table_name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <button className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 transition-colors">
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, highlight = false }: any) {
  const colorClasses: any = {
    rose: 'border-rose-100 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    amber: 'border-amber-100 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    indigo: 'border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    emerald: 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`p-6 rounded-3xl border shadow-sm transition-all bg-white dark:bg-slate-800 ${highlight ? 'ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-[#0B1120]' : 'border-slate-100 dark:border-slate-700/50'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl shadow-sm border ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-widest">
          {trend}
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{value}</div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{title}</div>
      </div>
    </motion.div>
  );
}
