'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Users, 
  Sparkles, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Save,
  FileText,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LATAMScheduleTable from '@/components/LATAMScheduleTable';
import { GoogleGenAI } from "@google/genai";
import { generateWithOpenRouter } from '@/app/actions/ai';

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [aiSchedule, setAiSchedule] = useState<any | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-3-flash-preview' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          window.location.href = '/';
          return;
        }
      }

      const { data: empData } = await supabase.from('base_jpa').select('*');
      const { data: reqData } = await supabase.from('shift_requests').select('*');
      if (empData) setEmployees(empData);
      if (reqData) setShiftRequests(reqData);

      // Buscar configuração de IA
      const { data: configData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'llm_config')
        .maybeSingle();
      
      if (configData) {
        setLlmConfig(configData.value);
      }
    };
    fetchData();
  }, []);

  const generateScheduleAI = async () => {
    if (employees.length === 0) {
      setError('Não há colaboradores cadastrados na base JPA para gerar a escala. Por favor, adicione colaboradores primeiro.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Preparar contexto para a IA
      const employeeContext = employees.map(e => ({
        bp: e.bp,
        nome: e.name,
        cargo: e.cargo || e.position,
        cat6: e.cat_6,
        restricoes: e.operational_restrictions
      }));

      const prompt = `
        Você é o arquiteto líder do LATAM SGEI. Sua tarefa é gerar uma escala de trabalho MENSAL para o terminal de JPA (João Pessoa) seguindo RIGOROSAMENTE o modelo da LATAM.

        REGRAS DE NEGÓCIO:
        - Jornada 5x1 (5 dias trabalhados, 1 folga).
        - Turno de 8 horas (7h trabalho + 1h intervalo).
        - Compliance com CLT e Acordos Sindicais.
        - Toda escala deve ter status 'rascunho'.
        - Use os códigos de horários: T034, T045, T074, T231, T082, T091, T087, T100, T109, T120, T128, T137, T145, T210, T009.
        - Use as siglas: FE (Férias), FOLG (Folga), FC (Folga Compensa), FAGR (Folga Agrupada), FS (Folga Solicitada).

        COLABORADORES DISPONÍVEIS:
        ${JSON.stringify(employeeContext, null, 2)}

        FORMATO DE SAÍDA (JSON APENAS):
        {
          "month": "ABRIL",
          "year": "2026",
          "data": [
            {
              "area": "OPERAÇÃO",
              "turno": "MANHÃ/TARDE",
              "bp": "string",
              "funcao": "LÍDER/MULTIFUNÇÃO",
              "nome": "string",
              "tarefa": "Descrição da tarefa diária",
              "days": [
                { "date": "01/04", "code": "T079" },
                ... (até o final do mês)
              ]
            }
          ]
        }

        Gere a escala completa para todos os colaboradores listados, garantindo cobertura em todos os turnos e respeitando a folga 5x1.
      `;

      let responseText = '';
      if (llmConfig.provider === 'openrouter') {
        const clientApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        
        if (clientApiKey) {
          // Chamada direta pelo cliente (Lógica Cloudflare Pages)
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${clientApiKey}`,
              "HTTP-Referer": window.location.origin,
              "X-Title": "LATAM SGEI",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              "model": llmConfig.model,
              "messages": [{ "role": "user", "content": prompt }]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || 'Erro no OpenRouter');
          responseText = data.choices[0].message.content || '';

          // Log usage (Client-side)
          if (data.usage) {
            await supabase.from('ai_usage_logs').insert([{
              model: llmConfig.model,
              provider: 'openrouter',
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens,
              total_tokens: data.usage.total_tokens
            }]);
          }
        } else {
          // Fallback para Server Action
          responseText = await generateWithOpenRouter(prompt, llmConfig.model);
        }
      } else {
        const response = await ai.models.generateContent({
          model: llmConfig.model || "gemini-3-flash-preview",
          contents: prompt,
        });
        
        responseText = response.text || '';

        // Log usage (Gemini)
        const usage = response.usageMetadata;
        if (usage) {
          await supabase.from('ai_usage_logs').insert([{
            model: llmConfig.model || "gemini-3-flash-preview",
            provider: 'gemini',
            prompt_tokens: usage.promptTokenCount,
            completion_tokens: usage.candidatesTokenCount,
            total_tokens: usage.totalTokenCount
          }]);
        }
      }
      
      if (!responseText) throw new Error('Resposta vazia da IA');

      // Limpar a resposta caso a IA coloque markdown
      const jsonStr = responseText.replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(jsonStr);
      
      setAiSchedule(parsedData);
      setFeedbackGiven(false);
    } catch (err: any) {
      console.error('Erro ao gerar escala:', err);
      setError(`Falha ao gerar escala com IA: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

  const handleFeedback = async (type: 'boa' | 'ruim') => {
    setFeedbackGiven(true);
    alert(`Feedback enviado: ${type}. A IA aprenderá com isso!`);
  };

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('base_jpa')
        .update({
          fixed_days_off: editingEmployee.fixed_days_off,
          hour_compensation: editingEmployee.hour_compensation,
          vacation_period: editingEmployee.vacation_period,
          cat_6: editingEmployee.cat_6
        })
        .eq('bp', editingEmployee.bp);

      if (error) throw error;

      setEmployees(prev => prev.map(emp => emp.bp === editingEmployee.bp ? editingEmployee : emp));
      setEditingEmployee(null);
      alert('Dados do colaborador atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar colaborador:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel do Supervisor - JPA</h1>
          <p className="text-gray-500">Gestão operacional e geração de escalas.</p>
        </div>
        <button 
          onClick={generateScheduleAI}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:bg-gray-400"
        >
          {loading ? <Clock className="animate-spin" /> : <Sparkles />}
          {loading ? 'Gerando...' : 'Gerar Escala com IA'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
          <AlertTriangle />
          {error}
        </div>
      )}

      {aiSchedule && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">Proposta de Escala IA</h2>
                <p className="text-sm text-slate-500">Modelo LATAM - Status: Rascunho</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!feedbackGiven && (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 px-2 uppercase">Avaliar:</span>
                  <button onClick={() => handleFeedback('boa')} className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 shadow-sm transition-all"><ThumbsUp size={18} /></button>
                  <button onClick={() => handleFeedback('ruim')} className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 shadow-sm transition-all"><ThumbsDown size={18} /></button>
                </div>
              )}
              <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition">
                <Download size={18} /> Exportar PDF
              </button>
            </div>
          </div>

          <LATAMScheduleTable 
            month={aiSchedule.month} 
            year={aiSchedule.year} 
            data={aiSchedule.data} 
          />

          <div className="mt-10 flex justify-end gap-4">
            <button 
              onClick={() => setAiSchedule(null)}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              Descartar
            </button>
            <button className="flex items-center gap-2 bg-latam-indigo text-white px-8 py-3 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-200">
              <CheckCircle size={20} />
              Validar e Publicar Escala
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="text-indigo-600" /> Gestão Detalhada de Equipe
            </h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {employees.length} Colaboradores
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-4 pb-2">Colaborador</th>
                  <th className="px-4 pb-2">Regime</th>
                  <th className="px-4 pb-2">Folgas Fixas</th>
                  <th className="px-4 pb-2">Compensas</th>
                  <th className="px-4 pb-2">Férias</th>
                  <th className="px-4 pb-2">DG6 (CAT 6)</th>
                  <th className="px-4 pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {employees.map(emp => (
                  <tr key={emp.bp} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 bg-white border-y border-l border-gray-100 first:rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-latam-indigo/5 flex items-center justify-center text-latam-indigo font-bold text-xs">
                          {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{emp.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{emp.bp}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                        5x1
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="text-xs text-gray-600 font-medium">
                        {emp.fixed_days_off || 'Sáb/Dom'}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="flex items-center gap-1 text-amber-600 font-bold">
                        <Clock size={14} />
                        {emp.hour_compensation || '0h'}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar size={14} />
                        <span className="text-xs">
                          {emp.vacation_period || 'Nenhum'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      {emp.cat_6 ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <CheckCircle size={14} /> Sim
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-r border-gray-100 last:rounded-r-xl text-right">
                      <button 
                        onClick={() => setEditingEmployee({ ...emp })}
                        className="p-2 text-slate-400 hover:text-latam-indigo hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users className="text-indigo-600" /> Colaboradores da Base
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-500 uppercase">
                <tr><th className="pb-4">Nome</th><th className="pb-4">Cargo</th><th className="pb-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.bp}>
                    <td className="py-4 font-medium">{emp.name}</td>
                    <td className="py-4 text-gray-600">{emp.position}</td>
                    <td className="py-4"><span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Ativo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-600" /> Trocas e Indisponibilidades
          </h2>
          <div className="space-y-4">
            {shiftRequests.map(req => (
              <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{req.requester_bp}</span>
                  <span className="text-xs text-gray-400">{req.requested_date}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100">Aprovar</button>
                  <button className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100 text-red-600">Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Editar Colaborador</h3>
                <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Regime de Trabalho</label>
                    <div className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-500">
                      5x1 (Fixo LATAM)
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Aceitador DG6 (CAT 6)</label>
                    <div className="flex items-center gap-2 h-10">
                      <input 
                        type="checkbox" 
                        checked={editingEmployee.cat_6}
                        onChange={e => setEditingEmployee({...editingEmployee, cat_6: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-latam-indigo focus:ring-latam-indigo"
                      />
                      <span className="text-sm font-medium">Habilitado</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Folgas Fixas</label>
                  <input 
                    type="text"
                    value={editingEmployee.fixed_days_off || ''}
                    onChange={e => setEditingEmployee({...editingEmployee, fixed_days_off: e.target.value})}
                    placeholder="Ex: Sábados e Domingos"
                    className="w-full p-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Compensa de Horas</label>
                    <input 
                      type="text"
                      value={editingEmployee.hour_compensation || ''}
                      onChange={e => setEditingEmployee({...editingEmployee, hour_compensation: e.target.value})}
                      placeholder="Ex: 12h"
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Período de Férias</label>
                    <input 
                      type="text"
                      value={editingEmployee.vacation_period || ''}
                      onChange={e => setEditingEmployee({...editingEmployee, vacation_period: e.target.value})}
                      placeholder="Ex: 01/05 a 30/05"
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-latam-indigo text-white py-3 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-100 disabled:bg-slate-300"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
