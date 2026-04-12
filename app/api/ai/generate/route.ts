import { NextResponse } from 'next/server';
import { generateWithGemini, generateWithOpenRouter } from '@/app/actions/ai';

export const maxDuration = 60; // Aumenta o tempo limite se suportado pela plataforma

export async function POST(req: Request) {
  try {
    const { prompt, model, provider } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let responseText = '';

    if (provider === 'gemini') {
      responseText = await generateWithGemini(prompt, model);
    } else if (provider === 'openrouter') {
      responseText = await generateWithOpenRouter(prompt, model);
    } else {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('[API-AI] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
