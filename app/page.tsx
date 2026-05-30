'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Download, Plus, Search, Upload, Lock, Sparkles } from 'lucide-react';
import { seedTasks } from '@/lib/seed';
import { Category, Priority, Task, TaskStatus } from '@/lib/types';

const cols: { id: TaskStatus; label: string }[] = [
  { id:'todo', label:'To Do' },
  { id:'progress', label:'In Progress' },
  { id:'review', label:'Review' },
  { id:'done', label:'Done' }
];
const categories: Category[] = ['Release','Artist','Marketing','Legal','Studio','Finance','Admin'];
const priorities: Priority[] = ['high','medium','low'];

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All'|Category>('All');
  const [dragId, setDragId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role:'user'|'assistant'; text:string}[]>([
    { role:'assistant', text:'Twin Love HQ online. Ask me to add tasks, plan your day, organize a rollout, or prioritize the board.' }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('tl_tasks');
    setTasks(saved ? JSON.parse(saved) : seedTasks);
    setUnlocked(localStorage.getItem('tl_unlocked') === 'yes');
  }, []);

  useEffect(() => { if (tasks.length) localStorage.setItem('tl_tasks', JSON.stringify(tasks)); }, [tasks]);

  const visible = useMemo(() => tasks.filter(t => {
    const q = query.toLowerCase();
    return (filter === 'All' || t.category === filter) && (!q || `${t.title} ${t.notes} ${t.assignee}`.toLowerCase().includes(q));
  }), [tasks, query, filter]);

  const stats = useMemo(() => ({
    total: tasks.length,
    progress: tasks.filter(t=>t.status==='progress').length,
    done: tasks.filter(t=>t.status==='done').length,
    overdue: tasks.filter(t=>t.status!=='done' && t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString())).length
  }), [tasks]);

  function unlock() {
    if (!password.trim()) return;
    localStorage.setItem('tl_unlocked', 'yes');
    setUnlocked(true);
  }

  function addTask() {
    const now = new Date().toISOString();
    setTasks(prev => [{ id: crypto.randomUUID(), title:'New Twin Love task', notes:'', category:'Admin', status:'todo', priority:'medium', assignee:'Eric', dueDate:'', createdAt:now, updatedAt:now }, ...prev]);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'twin-love-tasks.json';
    a.click();
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTasks(JSON.parse(String(reader.result)));
    reader.readAsText(file);
  }

  async function askAi() {
    if (!chatInput.trim()) return;
    const prompt = chatInput;
    setMessages(m => [...m, { role:'user', text: prompt }]);
    setChatInput('');
    try {
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt, tasks })
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      setMessages(m => [...m, { role:'assistant', text: data.message || data.text || 'Done.' }]);
    } catch {
      setMessages(m => [...m, { role:'assistant', text:'AI route is ready — add your OPENAI_API_KEY in Vercel environment variables to activate it.' }]);
    }
  }

  if (!unlocked) return (
    <main className="min-h-screen glow flex items-center justify-center p-6">
      <section className="card rounded-3xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="text-red-400"/>
          <div>
            <h1 className="text-2xl font-bold">Twin Love HQ</h1>
            <p className="text-white/55 text-sm">Private project management workspace</p>
          </div>
        </div>
        <input
          className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none"
          type="password"
          placeholder="Enter your private app password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&unlock()}
        />
        <button onClick={unlock} className="mt-4 w-full rounded-xl bg-red-600 hover:bg-red-500 py-3 font-semibold transition-colors">
          Open HQ
        </button>
        <p className="text-xs text-white/40 mt-4">Any password will work for now. Set APP_PASSWORD in Vercel env vars for real access control.</p>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen glow p-5 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-red-400 text-sm tracking-[.25em] uppercase">Twin Love</p>
            <h1 className="text-3xl lg:text-5xl font-black">Label HQ</h1>
            <p className="text-white/55 mt-2">Releases · Royalties · Artists · Events · Studio</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={addTask} className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 flex gap-2 items-center transition-colors">
              <Plus size={18}/>Add Task
            </button>
            <button onClick={exportJson} className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 flex gap-2 items-center transition-colors">
              <Download size={18}/>Export
            </button>
            <label className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 flex gap-2 items-center cursor-pointer transition-colors">
              <Upload size={18}/>Import
              <input type="file" accept="application/json" className="hidden" onChange={importJson}/>
            </label>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[['Total',stats.total],['In Progress',stats.progress],['Done',stats.done],['Overdue',stats.overdue]].map(([l,v])=>(
            <div key={String(l)} className="card rounded-2xl p-4">
              <div className="text-3xl font-black">{v}</div>
              <div className="text-white/50 text-sm">{l}</div>
            </div>
          ))}
        </section>

        {/* Search + Filters */}
        <section className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="card rounded-2xl px-4 py-3 flex items-center gap-2 flex-1">
            <Search size={18} className="text-white/40"/>
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search tasks, notes, assignees..."
              className="bg-transparent outline-none w-full placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['All', ...categories] as const).map(c=>(
              <button key={c} onClick={()=>setFilter(c)} className={`rounded-xl px-4 py-2 whitespace-nowrap transition-colors ${filter===c?'bg-red-600':'bg-white/10 hover:bg-white/20'}`}>
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Board + AI */}
        <section className="grid lg:grid-cols-[1fr_360px] gap-5">

          {/* Kanban board */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cols.map(col => (
              <div
                key={col.id}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>{ if(dragId) updateTask(dragId, { status: col.id }); setDragId(null); }}
                className="card rounded-3xl p-3 min-h-[480px]"
              >
                <div className="flex justify-between items-center px-2 mb-3">
                  <h2 className="font-bold text-white/80">{col.label}</h2>
                  <span className="text-xs bg-white/10 rounded-full px-2 py-1">
                    {visible.filter(t=>t.status===col.id).length}
                  </span>
                </div>
                <div className="space-y-3 scrollbar max-h-[70vh] overflow-y-auto pr-1">
                  {visible.filter(t=>t.status===col.id).map(t => (
                    <TaskCard key={t.id} task={t} setDragId={setDragId} updateTask={updateTask} deleteTask={deleteTask}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* AI sidebar */}
          <aside className="card rounded-3xl p-4 h-[720px] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="text-red-400"/>
              <h2 className="font-bold">AI Assistant</h2>
              <Sparkles size={16} className="text-white/40"/>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar space-y-3 pr-1">
              {messages.map((m,i)=>(
                <div key={i} className={`rounded-2xl px-3 py-2 text-sm ${m.role==='user'?'bg-red-600 ml-8':'bg-white/10 mr-8'}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&askAi()}
                placeholder="Ask: what should I focus on today?"
                className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none text-sm placeholder:text-white/30"
              />
              <button onClick={askAi} className="rounded-xl bg-red-600 hover:bg-red-500 px-4 font-semibold transition-colors">
                Ask
              </button>
            </div>
            <p className="text-xs text-white/35 mt-3">Add OPENAI_API_KEY in Vercel env vars to activate full AI.</p>
          </aside>

        </section>
      </div>
    </main>
  );
}

function TaskCard({ task, setDragId, updateTask, deleteTask }: {
  task: Task;
  setDragId: (id:string)=>void;
  updateTask:(id:string, patch:Partial<Task>)=>void;
  deleteTask:(id:string)=>void
}) {
  return (
    <article
      draggable
      onDragStart={()=>setDragId(task.id)}
      className="rounded-2xl bg-black/30 border border-white/10 p-3 cursor-grab active:cursor-grabbing"
    >
      <input
        value={task.title}
        onChange={e=>updateTask(task.id,{title:e.target.value})}
        className="bg-transparent outline-none font-semibold w-full mb-2 placeholder:text-white/30"
      />
      <textarea
        value={task.notes || ''}
        onChange={e=>updateTask(task.id,{notes:e.target.value})}
        placeholder="Notes..."
        className="bg-white/5 rounded-xl outline-none w-full text-sm p-2 min-h-[58px] text-white/70 placeholder:text-white/25 resize-none"
      />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <select value={task.category} onChange={e=>updateTask(task.id,{category:e.target.value as Category})} className="bg-white/10 rounded-lg p-2 text-sm outline-none">
          {(['Release','Artist','Marketing','Legal','Studio','Finance','Admin'] as Category[]).map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={task.priority} onChange={e=>updateTask(task.id,{priority:e.target.value as Priority})} className="bg-white/10 rounded-lg p-2 text-sm outline-none">
          {(['high','medium','low'] as Priority[]).map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <input
          value={task.assignee || ''}
          onChange={e=>updateTask(task.id,{assignee:e.target.value})}
          placeholder="Assignee"
          className="bg-white/10 rounded-lg p-2 text-sm outline-none placeholder:text-white/30"
        />
        <input
          type="date"
          value={task.dueDate || ''}
          onChange={e=>updateTask(task.id,{dueDate:e.target.value})}
          className="bg-white/10 rounded-lg p-2 text-sm outline-none"
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className={`text-xs rounded-full px-2 py-1 ${task.priority==='high'?'bg-red-500/25 text-red-200':task.priority==='medium'?'bg-yellow-500/20 text-yellow-100':'bg-green-500/20 text-green-100'}`}>
          {task.priority}
        </span>
        <button onClick={()=>deleteTask(task.id)} className="text-xs text-white/40 hover:text-red-300 transition-colors">
          Delete
        </button>
      </div>
    </article>
  );
}
