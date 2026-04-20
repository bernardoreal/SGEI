'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getOpenRouterKeyInfo } from '@/app/actions/ai';
import { 
  Sparkles,
  Cpu,
  Settings,
  History,
  Activity,
  DollarSign,
  Zap,
  BarChart2,
  ChevronLeft,
  Star,
  MessageSquare
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'motion/react';
import Link from 'next/link';

interface AILog {
  id: string;
  user_email?: string;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

export default function AIDashboard() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCost: 0,
    totalTokens: 0,
    totalRequests: 0,
    geminiDailyRequests: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [openRouterInfo, setOpenRouterInfo] = useState<any>(null);
  
  // Model Config System
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-3-flash-preview' });
  const [savingLlm, setSavingLlm] = useState(false);

  useEffect(() => {
    const fetchAIData = async () => {
      try {
        const [{ data: settingsData }, orInfo, { data: usageData }, { data: evalData }] = await Promise.all([
          supabase.from('system_settings').select('value').eq('key', 'llm_config').maybeSingle(),
          getOpenRouterKeyInfo(),
          supabase.from('ai_usage_logs').select(`*, users(email)`).order('created_at', { ascending: false }).limit(200),
          supabase.from('ai_evaluations').select(`*, users(name)`).order('created_at', { ascending: false }).limit(10)
        ]);

        if (settingsData) setLlmConfig(settingsData.value);
        if (orInfo) setOpenRouterInfo(orInfo);
        
        if (usageData) {
          const formattedLogs = usageData.map((log: any) => ({
            ...log,
            user_email: log.users?.email || 'Sistema'
          }));
          setLogs(formattedLogs);
          if (evalData) setEvaluations(evalData);

          let tCost = 0;
          let tTokens = 0;
          let geminiToday = 0;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          formattedLogs.forEach((log: AILog) => {
            const cost = Number(log.cost) || 0;
            tCost += cost;
            tTokens += log.total_tokens || 0;
            
            const logDate = new Date(log.created_at);
            if (log.provider === 'gemini' && logDate >= today) {
              geminiToday++;
            }
          });

          setStats({
            totalCost: tCost,
            totalTokens: tTokens,
            totalRequests: formattedLogs.length,
            geminiDailyRequests: geminiToday
          });

          // Generate simple chart data
          const charGrp: Record<string, number> = {};
          formattedLogs.forEach((log: AILog) => {
            const dStr = new Date(log.created_at).toLocaleDateString('pt-BR');
            charGrp[dStr] = (charGrp[dStr] || 0) + (log.total_tokens || 0);
          });
          const cData = Object.entries(charGrp).reverse().map(([date, tokens]) => ({ date, tokens }));
          setChartData(cData);
        }
      } catch (err) {
        console.error('Error fetching AI data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAIData();
  }, []);

  const handleUpdateLlmConfig = async (provider: string, model: string, saveToDb = false) => {
    if (saveToDb) {
      setSavingLlm(true);
      try {
        const newValue = { provider, model };
        const { error } = await supabase
          .from('system_settings')
          .upsert({ key: 'llm_config', value: newValue });

        if (error) throw error;
        
        await supabase.from('audit_log').insert({
          action: `Configuração do modelo de IA alterada para ${provider} / ${model}`,
          table_name: 'system_settings',
          record_id: 'llm_config' as any
        });
        
        alert('Configuração salva! O motor de escalas agora utilizará este modelo.');
      } catch (err: any) {
        alert('Erro ao salvar configuração: ' + err.message);
      } finally {
        setSavingLlm(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-[#0B1120]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold mb-4 text-sm transition-colors bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
            <ChevronLeft size={16} /> Voltar para o hub do Admin
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-indigo-600" size={32} />
            Dashboard de IA
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Monitore e configure o cérebro gerador de escalas do sistema.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3 w-fit">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap size={20} />
          </div>
          <div className="pr-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Latam SGEI API</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Operacional
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Cpu size={24} />
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Total de Tokens Processados</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalTokens.toLocaleString()}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Activity size={24} />
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Gerações de Escala Realizadas</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalRequests.toLocaleString()}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign size={24} />
            </div>
            {openRouterInfo && openRouterInfo.limit && (
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                Lim. ${openRouterInfo.limit}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Uso Acumulado</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ${llmConfig.provider === 'openrouter' && openRouterInfo ? openRouterInfo.usage.toFixed(4) : stats.totalCost.toFixed(4)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Settings size={24} />
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">LLM {llmConfig.provider}</div>
          <div className="text-[16px] font-black text-slate-900 dark:text-white truncate" title={llmConfig.model}>{llmConfig.model}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Model Config & Usage Limits */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
              Configuração do Motor
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Provedor Ativo</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const newProvider = 'gemini';
                      const newModel = 'gemini-3-flash-preview';
                      setLlmConfig({ provider: newProvider, model: newModel });
                      handleUpdateLlmConfig(newProvider, newModel, true);
                    }}
                    className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold ${llmConfig.provider === 'gemini' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    Google Gemini
                  </button>
                  <button 
                    onClick={() => {
                      const newProvider = 'openrouter';
                      const newModel = 'google/gemma-2-9b-it:free';
                      setLlmConfig({ provider: newProvider, model: newModel });
                      handleUpdateLlmConfig(newProvider, newModel, true);
                    }}
                    className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold ${llmConfig.provider === 'openrouter' ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    OpenRouter
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Seletor de Modelos</label>
                <select 
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={llmConfig.model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setLlmConfig({ ...llmConfig, model: newModel });
                    handleUpdateLlmConfig(llmConfig.provider, newModel, true);
                  }}
                  disabled={savingLlm}
                >
                  {llmConfig.provider === 'gemini' ? (
                    <>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Recomendado)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Maior Raciocínio)</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legado)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legado)</option>
                    </>
                  ) : (
                    <>
                      <option value="google/gemma-2-9b-it:free">Gemma 2 9B (FREE)</option>
                      <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (FREE)</option>
                      <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (FREE)</option>
                      <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (FREE)</option>
                    </>
                  )}
                </select>
              </div>

              {llmConfig.provider === 'openrouter' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-xl">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase flex items-center justify-between">
                    <span>Aviso OpenRouter</span>
                    <AlertTriangle size={12} />
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Modelos gratuitos estão sujeitos a falhas de cota e lentidão de terceiros.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity size={18} className="text-emerald-600 dark:text-emerald-400" />
              Limites & Cota Mensal
            </h3>
            
            {llmConfig.provider === 'gemini' ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Requisições Hoje</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {stats.geminiDailyRequests} <span className="text-sm text-slate-400">/ 1.500</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${stats.geminiDailyRequests > 1200 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((stats.geminiDailyRequests / 1500) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : openRouterInfo ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Créditos de API</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      ${openRouterInfo.usage.toFixed(4)} <span className="text-sm text-slate-400">/ ${openRouterInfo.limit || '∞'}</span>
                    </div>
                  </div>
                  {openRouterInfo.limit && (
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-500" 
                        style={{ width: `${Math.min((openRouterInfo.usage / openRouterInfo.limit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 h-[500px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-600 dark:text-indigo-400" />
            Tendência de Consumo de Tokens
          </h3>
          <div className="flex-1 w-full min-h-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#4f46e5' }}
                  />
                  <Area type="monotone" dataKey="tokens" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">Histórico insuficiente para exibição.</div>
            )}
          </div>
        </div>
      </div>

      {/* Avaliações dos Supervisores */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">                
        <div className="p-6 border-b border-slate-50 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Últimas Avaliações dos Supervisores
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Supervisor</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Avaliação</th>
                <th className="px-6 py-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 text-sm font-medium">
              {evaluations.map((evalItem: any) => (
                <tr key={evalItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                  <td className="px-6 py-4 tabular-nums text-slate-500 dark:text-slate-400">{new Date(evalItem.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-slate-900 dark:text-white">{evalItem.users?.name || 'Supervisor'}</td>
                  <td className="px-6 py-4 font-mono text-xs dark:text-indigo-300">{evalItem.model_used}</td>
                  <td className="px-6 py-4">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < evalItem.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 truncate max-w-xs">{evalItem.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">                
        <div className="p-6 border-b border-slate-50 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            Últimas Avaliações dos Supervisores
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Supervisor</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Avaliação</th>
                <th className="px-6 py-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 text-sm font-medium">
              {evaluations.map((evalItem: any) => (
                <tr key={evalItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                  <td className="px-6 py-4 tabular-nums text-slate-500 dark:text-slate-400">{new Date(evalItem.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-slate-900 dark:text-white">{evalItem.users?.name || 'Supervisor'}</td>
                  <td className="px-6 py-4 font-mono text-xs dark:text-indigo-300">{evalItem.model_used}</td>
                  <td className="px-6 py-4">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < evalItem.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 truncate max-w-xs" title={evalItem.feedback}>{evalItem.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History size={18} className="text-indigo-600 dark:text-indigo-400" />
            Audit Log de Gerações IA
          </h3>
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full">
            Top 200 Logs
          </span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
              <tr className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Modelo Utilizado</th>
                <th className="px-6 py-4">Input (Prompt)</th>
                <th className="px-6 py-4">Output (Geração)</th>
                <th className="px-6 py-4">Total Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 text-sm font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Ainda não foram geradas escalas pela IA.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 tabular-nums">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">
                        {log.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 tabular-nums">{log.prompt_tokens}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 tabular-nums">{log.completion_tokens}</td>
                    <td className="px-6 py-4 font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{log.total_tokens}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
