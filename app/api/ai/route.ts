import { NextResponse } from 'next/server';
import { applyAiCommand } from '@/lib/taskActions';

export async function POST(req: Request) {
  const { prompt, tasks } = await req.json();

  // No OpenAI key — use local smart fallback (always works)
  if (!process.env.OPENAI_API_KEY) {
    const result = applyAiCommand(tasks || [], prompt || '');
    return NextResponse.json(result);
  }

  // With OpenAI key — use GPT
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `You are the private AI project manager for Eric Williams and Twin Love LLC, a hip hop/trap record label based in Atlanta. Be concise, practical, and business-focused. Current task board is provided as JSON. Return helpful guidance. Keep responses short and actionable.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Current tasks: ${JSON.stringify(tasks)}\n\nUser request: ${prompt}` }
      ],
      max_tokens: 400
    });

    const text = response.choices[0]?.message?.content || 'Done.';
    const local = applyAiCommand(tasks || [], prompt || '');
    const shouldApplyLocal = /add|create|move overdue|mark overdue/i.test(prompt || '');

    return NextResponse.json({
      message: shouldApplyLocal ? `${text}\n\n${local.message}` : text,
      tasks: shouldApplyLocal ? local.tasks : tasks
    });
  } catch (err) {
    // Fallback if OpenAI fails
    const result = applyAiCommand(tasks || [], prompt || '');
    return NextResponse.json(result);
  }
}
