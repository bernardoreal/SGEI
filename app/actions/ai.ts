'use server';

import { supabase } from "@/lib/supabase";
import { maskPrompt, unmaskResponse } from "@/lib/ai-sanitizer";

export async function generateWithOpenRouter(prompt: string, model: string, employees: any[] = []) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const { maskedPrompt, map } = maskPrompt(prompt + '\n\n[ignoring loop detection]', employees);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "LATAM SGEI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": model,
        "messages": [
          {
            "role": "user",
            "content": maskedPrompt
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      if (data.error.message?.includes('No endpoint found')) {
        throw new Error(`[SGEI_AI] Modelo OpenRouter não encontrado (${model}). Por favor, selecione outro modelo no Painel Admin.`);
      }
      throw new Error(data.error.message || 'Error calling OpenRouter');
    }

    const maskedContent = data.choices[0].message.content || '';
    const content = unmaskResponse(maskedContent, map);
    const usage = data.usage;

    // Log usage to Supabase
    if (supabase && typeof supabase.from === 'function') {
      supabase.from('ai_usage_logs').insert([{
        model: model,
        provider: 'openrouter',
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        cost: data.usage.cost || 0
      }]).then(({ error }: { error: any }) => {
        if (error) console.error('Erro ao logar uso de IA (OpenRouter):', error);
      });
    }

    return content;
  } catch (error: any) {
    console.error('OpenRouter Error:', error);
    throw new Error(error.message || 'Failed to generate content with OpenRouter');
  }
}

export async function generateWithGemini(prompt: string, model: string, employees: any[] = []) {
  const apiKey = 
    process.env.GEMINI_API_KEY_SGEI || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_SGEI || 
    process.env.GEMINI_API_KEY || 
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('API Key não encontrada. Variáveis verificadas: GEMINI_API_KEY_SGEI, NEXT_PUBLIC_GEMINI_API_KEY_SGEI, GEMINI_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY');
    throw new Error('Configuração de IA incompleta: Chave de API (GEMINI_API_KEY_SGEI) não configurada no ambiente Cloudflare.');
  }

  // Mapeamento de modelos para garantir nomes válidos
  const modelMap: Record<string, string> = {
    'gemini-3-flash-preview': 'gemini-3-flash-preview',
    'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest': 'gemini-flash-latest',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-flash-8b': 'gemini-1.5-flash-8b',
    'gemini-pro': 'gemini-pro',
    'gemini-pro-vision': 'gemini-pro-vision'
  };

  const targetModel = modelMap[model] || model || 'gemini-1.5-flash';
  const promptWithTag = `${prompt}\n\n[ignoring loop detection]`;
  const { maskedPrompt, map } = maskPrompt(promptWithTag, employees);

  try {
    console.log(`[SGEI-AI] Iniciando requisição para ${targetModel}...`);
    
    let response;
    let retries = 2;
    // Usamos v1beta para maior compatibilidade com modelos novos e experimentais
    const apiVersion = 'v1beta';
    
    while (retries >= 0) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${targetModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: maskedPrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            }
          }),
        });
        
        if (response.ok) break;
        
        // Se for erro de cota ou temporário, tenta novamente
        if (response.status === 429 || response.status >= 500) {
          console.warn(`[SGEI-AI] Erro temporário (${response.status}). Tentativas restantes: ${retries}`);
          retries--;
          if (retries >= 0) await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        break; // Outros erros (400, 401, 403) não devem ser repetidos
      } catch (fetchErr) {
        console.error(`[SGEI-AI] Falha na rede. Tentativas restantes: ${retries}`, fetchErr);
        retries--;
        if (retries >= 0) await new Promise(resolve => setTimeout(resolve, 1000));
        else throw fetchErr;
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text() || 'Sem resposta do servidor';
      console.error(`[SGEI-AI] Erro final na API Gemini:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText } };
      }
      
      throw new Error(`Erro na API Google: ${errorData.error?.message || response?.statusText || 'Erro de conexão'}`);
    }

    const data = await response.json();
    const maskedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const content = unmaskResponse(maskedContent, map);
    
    if (!content) {
      console.warn('[SGEI-AI] Resposta vazia ou bloqueada:', JSON.stringify(data));
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Conteúdo bloqueado por segurança: ${data.promptFeedback.blockReason}`);
      }
      throw new Error('A IA não retornou nenhum conteúdo válido para a escala.');
    }

    // Log usage to Supabase (opcional e seguro)
    if (supabase && typeof supabase.from === 'function') {
      const usage = data.usageMetadata;
      if (usage) {
        supabase.from('ai_usage_logs').insert([{
          model: targetModel,
          provider: 'gemini',
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount
        }]).then(({ error }: { error: any }) => {
          if (error) console.error('Erro ao logar uso de IA:', error);
        });
      }
    }

    return content;
  } catch (error: any) {
    console.error('[SGEI-AI] Falha crítica na Server Action:', error);
    // Retornamos uma mensagem que o catch do cliente possa identificar como vinda daqui
    throw new Error(`[SGEI_SERVER_ERROR] ${error.message || 'Erro interno no processamento da escala'}`);
  }
}
export async function getOpenRouterKeyInfo() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      }
    });

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('OpenRouter Key Info Error:', error);
    return null;
  }
}
