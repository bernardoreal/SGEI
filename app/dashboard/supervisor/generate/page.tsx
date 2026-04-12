'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateWithOpenRouter, generateWithGemini } from '@/app/actions/ai';
import { Cpu, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ScheduleGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-3-flash-preview' });
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'llm_config')
          .maybeSingle();
        
        if (data) {
          setLlmConfig(data.value);
        }
      } catch (err) {
        console.error('Error fetching LLM config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const generateSchedule = async () => {
    setLoading(true);
    setResult(null);
    try {
      const prompt = `
        Gere uma escala de trabalho mensal para a base JPA da LATAM Cargo.
        Regras de Negócio:
        - Padrão: 5x1 (5 dias trabalhados para 1 de folga).
        - Jornada: 8 horas diárias (7h trabalhadas + 1h de intervalo).
        - Mínimo de 11 horas de descanso entre jornadas.
        - Cobertura mínima por turno: 5 colaboradores.
        - Cobertura mínima de CAT 6 por turno: 2 colaboradores.
        
        Formato de saída: Markdown com uma tabela clara por semana.
      `;
      
      let responseText = '';
      if (llmConfig.provider === 'openrouter') {
        const clientApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        
        if (clientApiKey) {
          // Chamada via Server Action
          responseText = await generateWithOpenRouter(prompt, llmConfig.model);
        } else {
          // Fallback para Server Action
          responseText = await generateWithOpenRouter(prompt, llmConfig.model);
        }
      } else {
        responseText = await generateWithGemini(prompt, llmConfig.model);
      }

      setResult(responseText || 'Não foi possível gerar a escala.');
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      setResult(`Erro ao gerar escala: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert([{
          content: result,
          status: 'rascunho',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      alert('Escala salva com sucesso!');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      alert(`Erro ao salvar escala: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="p-8 bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="text-amber-300" />
                Geração de Escala com IA
              </h1>
              <p className="text-indigo-100">Motor de inteligência artificial configurado pelo Administrador.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center gap-3">
              <Cpu size={20} className="text-amber-300" />
              <div className="text-xs">
                <div className="font-bold uppercase opacity-70">Modelo Ativo</div>
                <div className="font-mono">{configLoading ? 'Carregando...' : llmConfig.model}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0" size={20} />
            <div className="text-sm text-blue-800">
              <strong>Atenção:</strong> Esta escala é gerada automaticamente seguindo as regras 5x1 e CLT. 
              Após a geração, ela ficará em status de <strong>Rascunho</strong> e exigirá validação manual.
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={generateSchedule}
              disabled={loading || configLoading}
              className="group relative px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:bg-gray-300 flex items-center gap-3 overflow-hidden"
            >
              {loading && (
                <div className="absolute inset-0 bg-indigo-600 flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              <Sparkles className="group-hover:rotate-12 transition-transform" />
              {loading ? 'Processando Escala...' : 'Gerar Nova Escala Mensal'}
            </button>
          </div>

          {result && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" />
                  Escala Proposta pela IA
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={saveSchedule}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm"
                  >
                    Salvar Escala
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm">
                    Validar e Publicar
                  </button>
                  <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition">
                    Editar Manualmente
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 shadow-inner">
                <div className="prose prose-indigo max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{result}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
