'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Bot, Download, Plus, Search, Upload, Lock, Sparkles, Trash2, Calendar, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Category, Priority, Task, TaskStatus } from '@/lib/types';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const API = SUPABASE_URL && SUPABASE_KEY ? `${SUPABASE_URL}/rest/v1/tasks` : null;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
};

const cols: { id: TaskStatus; label: string; color: string }[] = [
  { id:'todo',     label:'To Do',       color:'#6b7280' },
  { id:'progress', label:'In Progress', color:'#3b82f6' },
  { id:'review',   label:'Review',      color:'#f59e0b' },
  { id:'done',     label:'Done',        color:'#22c55e' },
];
const categories: Category[] = ['Release','Artist','Marketing','Legal','Studio','Finance','Admin'];
const priorities: Priority[] = ['high','medium','low'];
const catColors: Record<string,string> = {
  Release:'#D4537E', Artist:'#3b82f6', Marketing:'#f59e0b',
  Legal:'#22c55e', Studio:'#8b5cf6', Finance:'#14b8a6', Admin:'#6b7280'
};
const priColors: Record<string,string> = { high:'#ef4444', medium:'#f59e0b', low:'#22c55e' };

// ── Supabase helpers ─────────────────────────────────────────
function dbToTask(r: any): Task {
  return {
    id: r.id, title: r.title, notes: r.notes||'',
    category: r.category||'Admin', status: r.status||'todo',
    priority: r.priority||'medium', assignee: r.assignee||'',
    dueDate: r.due_date||'', createdAt: r.created_at, updatedAt: r.updated_at
  };
}
function taskToDb(t: Partial<Task>) {
  return {
    ...(t.title !== undefined && { title: t.title }),
    ...(t.notes !== undefined && { notes: t.notes }),
    ...(t.category !== undefined && { category: t.category }),
    ...(t.status !== undefined && { status: t.status }),
    ...(t.priority !== undefined && { priority: t.priority }),
    ...(t.assignee !== undefined && { assignee: t.assignee }),
    ...(t.dueDate !== undefined && { due_date: t.dueDate || null }),
  };
}

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All'|Category>('All');
  const [dragId, setDragId] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState<string|null>(null);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [activeCol, setActiveCol] = useState<TaskStatus>('todo');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<{role:'user'|'assistant';text:string}[]>([
    { role:'assistant', text:'Twin Love HQ online. Ask me to add tasks, plan your day, or prioritize the board.' }
  ]);

  // ── Load tasks ───────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    if (API && SUPABASE_KEY) {
      try {
        setSyncing(true);
        const r = await fetch(`${API}?order=created_at.desc`, { headers: HEADERS });
        if (!r.ok) throw new Error('fetch failed');
        const data = await r.json();
        const loaded = data.map(dbToTask);
        setTasks(loaded);
        localStorage.setItem('tl_tasks', JSON.stringify(loaded));
        setSyncError(false);
      } catch {
        setSyncError(true);
        const saved = localStorage.getItem('tl_tasks');
        if (saved) setTasks(JSON.parse(saved));
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    } else {
      // No Supabase — use localStorage
      const saved = localStorage.getItem('tl_tasks');
      if (saved) setTasks(JSON.parse(saved));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnlocked(localStorage.getItem('tl_unlocked') === 'yes');
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!API && tasks.length) localStorage.setItem('tl_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const visible = useMemo(() => tasks.filter(t => {
    const q = query.toLowerCase();
    return (filter === 'All' || t.category === filter) &&
      (!q || `${t.title} ${t.notes} ${t.assignee}`.toLowerCase().includes(q));
  }), [tasks, query, filter]);

  const stats = useMemo(() => ({
    total: tasks.length,
    progress: tasks.filter(t=>t.status==='progress').length,
    done: tasks.filter(t=>t.status==='done').length,
    overdue: tasks.filter(t=>t.status!=='done'&&t.dueDate&&new Date(t.dueDate)<new Date(new Date().toDateString())).length
  }), [tasks]);

  // ── Task operations ──────────────────────────────────────
  async function addTask() {
    const now = new Date().toISOString();
    const tempId = crypto.randomUUID();
    const newTask: Task = { id: tempId, title:'New task', notes:'', category:'Admin', status:'todo', priority:'medium', assignee:'Eric', dueDate:'', createdAt:now, updatedAt:now };
    setTasks(p=>[newTask,...p]);
    if (API) {
      try {
        setSyncing(true); setSyncError(false);
        // Don't send id — let Supabase generate it
        const body = taskToDb(newTask);
        const r = await fetch(API, { method:'POST', headers: HEADERS, body: JSON.stringify(body) });
        if (!r.ok) {
          const errText = await r.text();
          console.error('Supabase add error:', r.status, errText);
          throw new Error(errText);
        }
        const rows = await r.json();
        const saved = dbToTask(rows[0]);
        // Replace temp task with real Supabase record
        setTasks(p=>p.map(t=>t.id===tempId ? saved : t));
      } catch(e) { console.error('addTask failed:', e); setSyncError(true); }
      finally { setSyncing(false); }
    }
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    setTasks(p=>p.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t));
    if (API) {
      try {
        setSyncing(true);
        const r = await fetch(`${API}?id=eq.${id}`, { method:'PATCH', headers: HEADERS, body: JSON.stringify(taskToDb(patch)) });
        if (!r.ok) { const e = await r.text(); console.error('update error:', e); throw new Error(e); }
        setSyncError(false);
      } catch(e) { console.error('updateTask failed:', e); setSyncError(true); }
      finally { setSyncing(false); }
    }
  }

  async function deleteTask(id: string) {
    setTasks(p=>p.filter(t=>t.id!==id));
    if (API) {
      try {
        setSyncing(true);
        const r = await fetch(`${API}?id=eq.${id}`, { method:'DELETE', headers: HEADERS });
        if (!r.ok) { const e = await r.text(); console.error('delete error:', e); throw new Error(e); }
        setSyncError(false);
      } catch(e) { console.error('deleteTask failed:', e); setSyncError(true); }
      finally { setSyncing(false); }
    }
  }

  function exportJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'}));
    a.download = 'twin-love-tasks.json'; a.click();
  }
  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = ()=>setTasks(JSON.parse(String(r.result))); r.readAsText(file);
  }

  async function askAi() {
    if (!chatInput.trim() || aiLoading) return;
    const prompt = chatInput;
    setMessages(m=>[...m,{role:'user',text:prompt}]);
    setChatInput(''); setAiLoading(true);
    try {
      const res = await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,tasks})});
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      setMessages(m=>[...m,{role:'assistant',text:data.message||data.text||'Done.'}]);
    } catch {
      setMessages(m=>[...m,{role:'assistant',text:'Add OPENAI_API_KEY in Vercel env vars to activate full AI.'}]);
    } finally { setAiLoading(false); }
  }

  function unlock() {
    if (!password.trim()) return;
    localStorage.setItem('tl_unlocked','yes');
    setUnlocked(true);
  }

  // ── Lock screen ──────────────────────────────────────────
  if (!unlocked) return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',background:'radial-gradient(circle at 20% 20%, rgba(210,32,70,.35), transparent 35%), #08080a'}}>
      <section style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'24px',padding:'36px',width:'100%',maxWidth:'420px',boxShadow:'0 20px 80px rgba(0,0,0,.4)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px'}}>
          <Lock size={22} color='#ef4444'/>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,margin:0}}>Twin Love HQ</h1>
            <p style={{fontSize:'13px',color:'rgba(255,255,255,.45)',margin:0}}>Private workspace</p>
          </div>
        </div>
        <input style={{width:'100%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'12px',padding:'12px 16px',outline:'none',color:'#f5f5f5',fontSize:'14px',boxSizing:'border-box'}}
          type="password" placeholder="Enter password" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&unlock()}/>
        <button onClick={unlock} style={{marginTop:'12px',width:'100%',background:'#D4537E',border:'none',borderRadius:'12px',padding:'12px',color:'#fff',fontWeight:600,fontSize:'15px',cursor:'pointer'}}>
          Open HQ
        </button>
        <p style={{fontSize:'12px',color:'rgba(255,255,255,.3)',marginTop:'16px',textAlign:'center'}}>Any password works — set APP_PASSWORD in Vercel for real access control</p>
      </section>
    </main>
  );

  // ── Sync status dot ──────────────────────────────────────
  const syncDot = API ? (
    <span title={syncError?'Sync error — check connection':syncing?'Saving...':'Synced to cloud'} style={{width:'8px',height:'8px',borderRadius:'50%',display:'inline-block',background:syncError?'#ef4444':syncing?'#f59e0b':'#22c55e',flexShrink:0}}/>
  ) : (
    <span title="Local only — add Supabase keys to sync" style={{width:'8px',height:'8px',borderRadius:'50%',display:'inline-block',background:'#6b7280',flexShrink:0}}/>
  );

  return (
    <main style={{minHeight:'100vh',background:'radial-gradient(circle at 20% 20%, rgba(210,32,70,.28), transparent 40%), #08080a',padding:'16px',fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif',color:'#f5f5f5'}}>
      <div style={{maxWidth:'1600px',margin:'0 auto'}}>

        {/* Header */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',gap:'12px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
            {syncDot}
            <div style={{minWidth:0}}>
              <p style={{fontSize:'10px',letterSpacing:'.2em',color:'#D4537E',textTransform:'uppercase',margin:0}}>Twin Love</p>
              <h1 style={{fontSize:'clamp(22px, 5vw, 32px)',fontWeight:900,margin:0,lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Label HQ</h1>
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={addTask} style={{background:'#D4537E',border:'none',borderRadius:'10px',padding:'9px 14px',color:'#fff',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',whiteSpace:'nowrap'}}>
              <Plus size={15}/>Add Task
            </button>
            <Link href="/calendar" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',color:'#f5f5f5',textDecoration:'none',display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}>
              <Calendar size={14}/>Calendar
            </Link>
            <Link href="/inbox" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',color:'#f5f5f5',textDecoration:'none',display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}>
              <Inbox size={14}/>Inbox
            </Link>
            <button onClick={exportJson} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}>
              <Download size={14}/>
            </button>
            <label style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}>
              <Upload size={14}/>
              <input type="file" accept="application/json" style={{display:'none'}} onChange={importJson}/>
            </label>
            <button onClick={()=>setShowAI(v=>!v)} style={{background:showAI?'#D4537E':'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}>
              <Bot size={14}/>AI
            </button>
          </div>
        </header>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
          {[
            {label:'Total', value:stats.total, color:'#D4537E'},
            {label:'In Progress', value:stats.progress, color:'#3b82f6'},
            {label:'Done', value:stats.done, color:'#22c55e'},
            {label:'Overdue', value:stats.overdue, color:'#ef4444'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'12px',padding:'12px 14px',borderTop:`3px solid ${s.color}`}}>
              <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:'11px',color:'rgba(255,255,255,.45)',marginTop:'3px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexDirection:'column'}}>
          <div style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
            <Search size={14} color='rgba(255,255,255,.35)'/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks..."
              style={{background:'transparent',border:'none',outline:'none',color:'#f5f5f5',fontSize:'13px',width:'100%'}}/>
          </div>
          <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'2px'}}>
            {(['All',...categories] as const).map(c=>(
              <button key={c} onClick={()=>setFilter(c)}
                style={{padding:'6px 12px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:500,flexShrink:0,
                  background:filter===c?'#D4537E':'rgba(255,255,255,.08)',
                  color:filter===c?'#fff':'rgba(255,255,255,.6)'}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile column tabs */}
        <div style={{display:'flex',gap:'6px',marginBottom:'12px',overflowX:'auto',paddingBottom:'2px'}}>
          {cols.map(col=>(
            <button key={col.id} onClick={()=>setActiveCol(col.id)}
              style={{padding:'7px 14px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:600,flexShrink:0,
                background:activeCol===col.id?col.color:'rgba(255,255,255,.07)',
                color:activeCol===col.id?'#fff':'rgba(255,255,255,.5)'}}>
              {col.label} <span style={{opacity:.7}}>({visible.filter(t=>t.status===col.id).length})</span>
            </button>
          ))}
        </div>

        {/* Main layout */}
        <div style={{display:'grid',gridTemplateColumns:showAI?'1fr 300px':'1fr',gap:'16px',alignItems:'start'}}>

          {/* Kanban — desktop: 4 cols, mobile: 1 active col */}
          <div>
            {/* Desktop board */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}} className="desktop-board">
              {cols.map(col=>{
                const colTasks = visible.filter(t=>t.status===col.id);
                return (
                  <div key={col.id}
                    onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
                    onDragLeave={()=>setDragOver(null)}
                    onDrop={()=>{ if(dragId) updateTask(dragId,{status:col.id}); setDragId(null); setDragOver(null); }}
                    style={{background:dragOver===col.id?'rgba(255,255,255,.07)':'rgba(255,255,255,.03)',border:`1px solid ${dragOver===col.id?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)'}`,borderRadius:'14px',padding:'12px',minHeight:'400px',transition:'all .15s'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',paddingBottom:'8px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:col.color,display:'inline-block'}}/>
                        <span style={{fontSize:'11px',fontWeight:700,color:'rgba(255,255,255,.6)',textTransform:'uppercase',letterSpacing:'.06em'}}>{col.label}</span>
                      </div>
                      <span style={{fontSize:'11px',background:'rgba(255,255,255,.08)',borderRadius:'99px',padding:'2px 7px',color:'rgba(255,255,255,.4)'}}>{colTasks.length}</span>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                      {loading ? <div style={{color:'rgba(255,255,255,.3)',fontSize:'13px',padding:'8px'}}>Loading...</div> :
                        colTasks.map(t=><TaskCard key={t.id} task={t} setDragId={setDragId} updateTask={updateTask} deleteTask={deleteTask}/>)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile board — single active column */}
            <div className="mobile-board">
              {cols.filter(col=>col.id===activeCol).map(col=>{
                const colTasks = visible.filter(t=>t.status===col.id);
                return (
                  <div key={col.id} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'14px',padding:'12px',minHeight:'300px'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                      {loading ? <div style={{color:'rgba(255,255,255,.3)',fontSize:'13px',padding:'8px'}}>Loading...</div> :
                        colTasks.length===0 ? <div style={{color:'rgba(255,255,255,.2)',fontSize:'13px',padding:'12px',textAlign:'center'}}>No tasks here</div> :
                        colTasks.map(t=><TaskCard key={t.id} task={t} setDragId={setDragId} updateTask={updateTask} deleteTask={deleteTask}/>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Sidebar */}
          {showAI && (
            <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'14px',padding:'14px',display:'flex',flexDirection:'column',height:'600px',position:'sticky',top:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',paddingBottom:'10px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                <Bot size={16} color='#D4537E'/>
                <span style={{fontWeight:700,fontSize:'14px'}}>AI Assistant</span>
                <Sparkles size={12} color='rgba(255,255,255,.3)' style={{marginLeft:'auto'}}/>
              </div>
              <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'8px',paddingRight:'2px'}}>
                {messages.map((m,i)=>(
                  <div key={i} style={{padding:'9px 11px',borderRadius:'10px',fontSize:'13px',lineHeight:1.5,
                    background:m.role==='user'?'#D4537E':'rgba(255,255,255,.07)',
                    marginLeft:m.role==='user'?'20px':'0',
                    marginRight:m.role==='user'?'0':'20px',
                    color:m.role==='user'?'#fff':'rgba(255,255,255,.8)'}}>
                    {m.text}
                  </div>
                ))}
                {aiLoading && <div style={{padding:'9px 11px',borderRadius:'10px',fontSize:'13px',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.4)',marginRight:'20px'}}>Thinking...</div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{marginTop:'10px',display:'flex',gap:'6px'}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&askAi()}
                  placeholder="Ask anything..."
                  style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'9px',padding:'8px 11px',outline:'none',color:'#f5f5f5',fontSize:'13px'}}/>
                <button onClick={askAi} disabled={aiLoading}
                  style={{background:'#D4537E',border:'none',borderRadius:'9px',padding:'8px 13px',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:'13px',opacity:aiLoading?.6:1}}>
                  Ask
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .desktop-board { display: grid !important; }
        .mobile-board  { display: none  !important; }
        @media (max-width: 768px) {
          .desktop-board { display: none  !important; }
          .mobile-board  { display: block !important; }
        }
      `}</style>
    </main>
  );
}

function TaskCard({ task, setDragId, updateTask, deleteTask }: {
  task: Task; setDragId:(id:string)=>void;
  updateTask:(id:string,patch:Partial<Task>)=>void;
  deleteTask:(id:string)=>void;
}) {
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString());
  return (
    <article draggable onDragStart={()=>setDragId(task.id)}
      style={{background:'rgba(255,255,255,.055)',border:'1px solid rgba(255,255,255,.09)',borderRadius:'12px',padding:'12px',cursor:'grab',transition:'border-color .15s'}}>
      <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'7px',flexWrap:'wrap'}}>
        <span style={{fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'99px',background:`${catColors[task.category]}22`,color:catColors[task.category],border:`1px solid ${catColors[task.category]}44`}}>
          {task.category}
        </span>
        <span style={{fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'99px',background:`${priColors[task.priority]}22`,color:priColors[task.priority],border:`1px solid ${priColors[task.priority]}44`}}>
          {task.priority}
        </span>
        {isOverdue && <span style={{fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'99px',background:'rgba(239,68,68,.15)',color:'#ef4444',border:'1px solid rgba(239,68,68,.3)',marginLeft:'auto'}}>Overdue</span>}
      </div>
      <input value={task.title} onChange={e=>updateTask(task.id,{title:e.target.value})}
        style={{background:'transparent',border:'none',outline:'none',fontWeight:600,fontSize:'13px',color:'#f5f5f5',width:'100%',marginBottom:'6px'}}/>
      <textarea value={task.notes||''} onChange={e=>updateTask(task.id,{notes:e.target.value})}
        placeholder="Add notes..."
        style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',outline:'none',width:'100%',fontSize:'12px',padding:'6px 8px',color:'rgba(255,255,255,.6)',resize:'none',minHeight:'44px',lineHeight:1.5,boxSizing:'border-box'}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginTop:'6px'}}>
        <select value={task.category} onChange={e=>updateTask(task.id,{category:e.target.value as Category})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 6px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={task.priority} onChange={e=>updateTask(task.id,{priority:e.target.value as Priority})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 6px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}>
          {priorities.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <input value={task.assignee||''} onChange={e=>updateTask(task.id,{assignee:e.target.value})}
          placeholder="Assignee"
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 6px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}/>
        <input type="date" value={task.dueDate||''} onChange={e=>updateTask(task.id,{dueDate:e.target.value})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 6px',fontSize:'11px',color:isOverdue?'#ef4444':'rgba(255,255,255,.7)',outline:'none'}}/>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:'7px'}}>
        <button onClick={()=>deleteTask(task.id)}
          style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',padding:'2px 4px',borderRadius:'6px'}}>
          <Trash2 size={11}/>Delete
        </button>
      </div>
    </article>
  );
}
