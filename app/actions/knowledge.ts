'use server';

import { createClient } from '@supabase/supabase-js';
import pdfParse from "pdf-parse";
import { generateWithGemini, generateWithOpenRouter } from './ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function uploadKnowledgeBaseFile(formData: FormData, token: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('Nenhum arquivo enviado.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extrair texto do PDF
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim() === '') {
      throw new Error('Não foi possível extrair texto deste PDF.');
    }

    // Buscar configuração de IA para usar na limpeza do texto
    const { data: configData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'llm_config')
      .maybeSingle();
      
    const provider = configData?.value?.provider || 'gemini';
    const model = configData?.value?.model || 'gemini-1.5-flash';

    const prompt = `Você é um assistente de extração de dados. 
Abaixo está o texto bruto extraído de um PDF de escala de trabalho.
Sua tarefa é extrair APENAS os padrões de escala (dias, turnos trabalhados, folgas, FAGR) associados a cada colaborador.
IGNORE COMPLETAMENTE:
- Cabeçalhos, rodapés e títulos
- Legendas de turnos (ex: "T074 - 06:00 as 14:00", "FOLG - Folga")
- Assinaturas e observações gerais
- Qualquer informação que não seja a sequência de trabalho/folga das pessoas.

Retorne os dados limpos, focando apenas no padrão de turnos de cada pessoa.

TEXTO BRUTO:
${rawText}`;

    let cleanText = rawText;
    try {
      if (provider === 'openrouter') {
        cleanText = await generateWithOpenRouter(prompt, model, []);
      } else {
        cleanText = await generateWithGemini(prompt, model, []);
      }
    } catch (aiError) {
      console.warn('Erro ao limpar texto com IA, usando texto bruto como fallback:', aiError);
      // Fallback: basic regex cleanup
      cleanText = rawText
        .replace(/Legenda[\s\S]*/gi, '')
        .replace(/T\d{3}\s*-.*$/gm, '');
    }

    // Salvar no banco de dados
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([
        {
          file_name: file.name,
          content: cleanText.trim()
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar no banco: ${error.message}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro no upload do PDF:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteKnowledgeBaseFile(id: string, token: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar: ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao deletar arquivo:', error);
    return { success: false, error: error.message };
  }
}
