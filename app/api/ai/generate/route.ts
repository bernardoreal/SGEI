import { NextResponse } from 'next/server';
import { generateWithGemini, generateWithOpenRouter } from '@/app/actions/ai';

export const runtime = 'edge';
export const maxDuration = 60; // Aumenta o tempo limite se suportado pela plataforma

export async function POST(req: Request) {
  try {
    const { prompt, model, provider, employees } = await req.json();
    console.log(`[API-AI] Request received: Provider=${provider}, Model=${model}`);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let responseText = '';

    if (provider === 'gemini') {
      responseText = await generateWithGemini(prompt, model, employees || []);
    } else if (provider === 'openrouter') {
      responseText = await generateWithOpenRouter(prompt, model, employees || []);
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
