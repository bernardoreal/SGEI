'use server';

import { GoogleGenAI } from "@google/genai";

export async function generateWithOpenRouter(prompt: string, model: string) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

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
            "content": prompt
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error calling OpenRouter');
    }

    return data.choices[0].message.content || '';
  } catch (error: any) {
    console.error('OpenRouter Error:', error);
    throw new Error(error.message || 'Failed to generate content with OpenRouter');
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
