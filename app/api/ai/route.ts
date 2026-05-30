import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { prompt, tasks } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: 'Add OPENAI_API_KEY in Vercel environment variables to activate AI.', tasks });
  }

  const systemPrompt = `You are the AI project manager for Eric Williams and Twin Love LLC, a hip hop/trap record label based in Atlanta. You have FULL control over the task board. You can add, update, move, and delete tasks.

Current date: ${new Date().toISOString().slice(0,10)}

TASK SCHEMA (strict):
{
  "id": "uuid string (keep existing, omit for new tasks)",
  "title": "string",
  "notes": "string",
  "category": "Release" | "Artist" | "Marketing" | "Legal" | "Studio" | "Finance" | "Admin",
  "status": "todo" | "progress" | "review" | "done",
  "priority": "high" | "medium" | "low",
  "assignee": "string",
  "dueDate": "YYYY-MM-DD or empty string"
}

INSTRUCTIONS:
- You MUST respond with a JSON object only. No markdown, no explanation outside JSON.
- Return this exact structure:
{
  "message": "conversational response to the user explaining what you did",
  "tasks": [...full updated task array...],
  "actions": ["short description of each change made"]
}

RULES:
- When adding tasks, omit the "id" field entirely — the app will generate it
- Always return the COMPLETE tasks array including unchanged tasks
- Be smart about categories: beats/recording = Studio, contracts = Legal, events/promo = Marketing, royalties/money = Finance, drops/albums = Release
- Be smart about priority: deadlines soon or money-related = high, general work = medium, low urgency = low
- If asked to move a task, change its status field
- If asked to add multiple tasks, add all of them
- Keep assignee as "Eric" unless specified otherwise
- For Twin Love specific context: Eric is the label owner, Twin Trax are the producers

EXAMPLES of what you can do:
- "add a task for booking studio time next week" → add task, Studio, medium priority
- "move Song Wars to in progress" → find that task, set status to progress  
- "add 5 tasks for the summer EP rollout" → create 5 relevant tasks
- "mark everything overdue as high priority" → update all overdue tasks
- "what should I focus on today" → analyze board, respond in message, don't change tasks
- "done with the royalty sheet" → find that task, set status to done`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current tasks board:\n${JSON.stringify(tasks, null, 2)}\n\nUser request: ${prompt}` }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ message: 'OpenAI error — check your API key and billing.', tasks });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', cleaned);
      return NextResponse.json({ message: raw, tasks });
    }

    // Make sure new tasks have IDs
    const updatedTasks = (parsed.tasks || tasks).map((t: any) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Sync new/updated tasks to Supabase if keys are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const headers = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      };
      const api = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/tasks`;

      // Find new tasks (no matching id in original tasks)
      const originalIds = new Set(tasks.map((t: any) => t.id));
      const newTasks = updatedTasks.filter((t: any) => !originalIds.has(t.id));
      const changedTasks = updatedTasks.filter((t: any) => {
        const orig = tasks.find((o: any) => o.id === t.id);
        return orig && JSON.stringify(orig) !== JSON.stringify(t);
      });

      // Insert new tasks
      for (const t of newTasks) {
        try {
          await fetch(api, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              title: t.title, notes: t.notes, category: t.category,
              status: t.status, priority: t.priority, assignee: t.assignee,
              due_date: t.dueDate || null
            })
          });
        } catch(e) { console.error('Failed to insert task:', e); }
      }

      // Update changed tasks
      for (const t of changedTasks) {
        try {
          await fetch(`${api}?id=eq.${t.id}`, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              title: t.title, notes: t.notes, category: t.category,
              status: t.status, priority: t.priority, assignee: t.assignee,
              due_date: t.dueDate || null, updated_at: new Date().toISOString()
            })
          });
        } catch(e) { console.error('Failed to update task:', e); }
      }
    }

    return NextResponse.json({
      message: parsed.message || 'Done.',
      tasks: updatedTasks,
      actions: parsed.actions || []
    });

  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ message: 'Something went wrong. Try again.', tasks });
  }
}
