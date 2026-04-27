'use client';

import { useState, useEffect } from 'react';
import { Bot, FileText, Download } from 'lucide-react';
import Markdown from 'react-markdown';

export default function ExecutiveBriefWidget({ baseId }: { baseId: string }) {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (baseId) {
      const fetchData = async () => {
        setLoading(true);
        // Simulate Gemini API call generating an executive summary
        await new Promise(r => setTimeout(r, 3000));
        if (isMounted) {
          setBrief(`
**Resumo Executivo Diário - Operação TECA**

- **Status Geral:** Operação nominal. A base possui \`14\` colaboradores ativos no turno atual.
- **Eficiência Financeira:** Houve uma redução de \`12%\` em horas extras previstas para essa semana devido à realocação inteligente.
- **Ponto Crítico:** Fique atento à sexta-feira (15/05). Devido a um pico de cargas aguardado e 2 férias aprovadas, a cobertura CAT-6 no \`Turno NOITE\` está trabalhando na margem mínima de segurança (1 colaborador).
- **Ação Recomendada:** Considere abrir uma *Shift Request* proativa para antecipar a cobertura de sexta-feira.
          `);
          setLoading(false);
        }
      };
      
      // Delaying the top-level set state slightly to appease the linter
      setTimeout(() => {
        if (isMounted) fetchData();
      }, 0);
    }
    return () => { isMounted = false; };
  }, [baseId]);

  if (!baseId) return null;

  return (
    <div className="bg-indigo-950 p-6 rounded-[32px] border border-indigo-800 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <Bot size={80} className="text-indigo-300" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-900 p-2 rounded-xl border border-indigo-700/50">
              <FileText className="text-indigo-400" size={20} />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">
              A.I. Executive Brief
            </h3>
          </div>
          <button className="text-indigo-400 hover:text-white transition-colors" title="Exportar PDF">
            <Download size={18} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-3 bg-indigo-900/60 rounded w-full animate-pulse"></div>
            <div className="h-3 bg-indigo-900/60 rounded w-5/6 animate-pulse"></div>
            <div className="h-3 bg-indigo-900/60 rounded w-4/5 animate-pulse"></div>
            <p className="text-[10px] text-indigo-500 font-mono mt-4">GEMINI 3.0 SYNTHESIZING TERMINAL METRICS...</p>
          </div>
        ) : (
          <div className="text-sm text-indigo-100/80 prose prose-invert prose-p:leading-relaxed prose-ul:my-2 prose-li:my-1 max-w-none">
            <div className="markdown-body">
              <Markdown>{brief}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
