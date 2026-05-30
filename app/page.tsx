'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Bot, Download, Plus, Search, Upload, Lock, Sparkles, Trash2, GripVertical } from 'lucide-react';
import { seedTasks } from '@/lib/seed';
import { Category, Priority, Task, TaskStatus } from '@/lib/types';

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

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All'|Category>('All');
  const [dragId, setDragId] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState<string|null>(null);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<{role:'user'|'assistant';text:string}[]>([
    { role:'assistant', text:'Twin Love HQ online. Ask me to add tasks, plan your day, or prioritize the board.' }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('tl_tasks');
    setTasks(saved ? JSON.parse(saved) : seedTasks);
    setUnlocked(localStorage.getItem('tl_unlocked') === 'yes');
  }, []);
  useEffect(() => { if (tasks.length) localStorage.setItem('tl_tasks', JSON.stringify(tasks)); }, [tasks]);
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

  function unlock() { if (!password.trim()) return; localStorage.setItem('tl_unlocked','yes'); setUnlocked(true); }
  function addTask() {
    const now = new Date().toISOString();
    setTasks(p=>[{id:crypto.randomUUID(),title:'New task',notes:'',category:'Admin',status:'todo',priority:'medium',assignee:'Eric',dueDate:'',createdAt:now,updatedAt:now},...p]);
  }
  function updateTask(id:string, patch:Partial<Task>) {
    setTasks(p=>p.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t));
  }
  function deleteTask(id:string) { setTasks(p=>p.filter(t=>t.id!==id)); }
  function exportJson() {
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'}));
    a.download='twin-love-tasks.json'; a.click();
  }
  function importJson(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return;
    const r=new FileReader(); r.onload=()=>setTasks(JSON.parse(String(r.result))); r.readAsText(file);
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
      setMessages(m=>[...m,{role:'assistant',text:'Add OPENAI_API_KEY in Vercel env vars to activate full AI. Local commands still work!'}]);
    } finally { setAiLoading(false); }
  }

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
        <input style={{width:'100%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'12px',padding:'12px 16px',outline:'none',color:'#f5f5f5',fontSize:'14px'}}
          type="password" placeholder="Enter password" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&unlock()}/>
        <button onClick={unlock} style={{marginTop:'12px',width:'100%',background:'#D4537E',border:'none',borderRadius:'12px',padding:'12px',color:'#fff',fontWeight:600,fontSize:'15px',cursor:'pointer'}}>
          Open HQ
        </button>
        <p style={{fontSize:'12px',color:'rgba(255,255,255,.3)',marginTop:'16px',textAlign:'center'}}>Any password works — set APP_PASSWORD in Vercel for real access control</p>
      </section>
    </main>
  );

  return (
    <main style={{minHeight:'100vh',background:'radial-gradient(circle at 20% 20%, rgba(210,32,70,.28), transparent 40%), #08080a',padding:'24px 28px',fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif'}}>
      <div style={{maxWidth:'1600px',margin:'0 auto'}}>

        {/* Header */}
        <header style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'28px',flexWrap:'wrap',gap:'16px'}}>
          <div>
            <p style={{fontSize:'11px',letterSpacing:'.25em',color:'#D4537E',textTransform:'uppercase',margin:'0 0 4px'}}>Twin Love</p>
            <h1 style={{fontSize:'36px',fontWeight:900,margin:'0 0 4px',lineHeight:1.1}}>Label HQ</h1>
            <p style={{fontSize:'13px',color:'rgba(255,255,255,.4)',margin:0}}>Releases · Royalties · Artists · Events · Studio</p>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
            <button onClick={addTask} style={{background:'#D4537E',border:'none',borderRadius:'10px',padding:'9px 16px',color:'#fff',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px'}}>
              <Plus size={16}/>Add Task
            </button>
            <button onClick={exportJson} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 14px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
              <Download size={15}/>Export
            </button>
            <label style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 14px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
              <Upload size={15}/>Import
              <input type="file" accept="application/json" style={{display:'none'}} onChange={importJson}/>
            </label>
          </div>
        </header>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            {label:'Total Tasks', value:stats.total, color:'#D4537E'},
            {label:'In Progress', value:stats.progress, color:'#3b82f6'},
            {label:'Done', value:stats.done, color:'#22c55e'},
            {label:'Overdue', value:stats.overdue, color:'#ef4444'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'16px 20px',borderTop:`3px solid ${s.color}`}}>
              <div style={{fontSize:'32px',fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,.45)',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div style={{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap',alignItems:'center'}}>
          <div style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 14px',display:'flex',alignItems:'center',gap:'8px',flex:'1',minWidth:'200px'}}>
            <Search size={15} color='rgba(255,255,255,.35)'/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks, notes, assignees..."
              style={{background:'transparent',border:'none',outline:'none',color:'#f5f5f5',fontSize:'13px',width:'100%'}}/>
          </div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {(['All',...categories] as const).map(c=>(
              <button key={c} onClick={()=>setFilter(c)}
                style={{padding:'8px 14px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:500,
                  background:filter===c?'#D4537E':'rgba(255,255,255,.08)',
                  color:filter===c?'#fff':'rgba(255,255,255,.6)'}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout: board + AI */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'16px',alignItems:'start'}}>

          {/* Kanban board */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',minWidth:0}}>
            {cols.map(col=>{
              const colTasks = visible.filter(t=>t.status===col.id);
              return (
                <div key={col.id}
                  onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={()=>{ if(dragId) updateTask(dragId,{status:col.id}); setDragId(null); setDragOver(null); }}
                  style={{background:dragOver===col.id?'rgba(255,255,255,.06)':'rgba(255,255,255,.03)',border:`1px solid ${dragOver===col.id?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)'}`,borderRadius:'16px',padding:'14px',minHeight:'500px',transition:'all .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',paddingBottom:'10px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                      <span style={{width:'8px',height:'8px',borderRadius:'50%',background:col.color,display:'inline-block'}}/>
                      <span style={{fontSize:'12px',fontWeight:600,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'.06em'}}>{col.label}</span>
                    </div>
                    <span style={{fontSize:'11px',background:'rgba(255,255,255,.1)',borderRadius:'99px',padding:'2px 8px',color:'rgba(255,255,255,.5)'}}>{colTasks.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {colTasks.map(t=>(
                      <TaskCard key={t.id} task={t} setDragId={setDragId} updateTask={updateTask} deleteTask={deleteTask}/>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Sidebar */}
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'16px',display:'flex',flexDirection:'column',height:'640px',position:'sticky',top:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px',paddingBottom:'12px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
              <Bot size={18} color='#D4537E'/>
              <span style={{fontWeight:700,fontSize:'15px'}}>AI Assistant</span>
              <Sparkles size={13} color='rgba(255,255,255,.3)' style={{marginLeft:'auto'}}/>
            </div>
            <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'8px',paddingRight:'4px'}}>
              {messages.map((m,i)=>(
                <div key={i} style={{padding:'10px 12px',borderRadius:'12px',fontSize:'13px',lineHeight:1.5,
                  background:m.role==='user'?'#D4537E':'rgba(255,255,255,.07)',
                  marginLeft:m.role==='user'?'24px':'0',
                  marginRight:m.role==='user'?'0':'24px',
                  color:m.role==='user'?'#fff':'rgba(255,255,255,.8)'}}>
                  {m.text}
                </div>
              ))}
              {aiLoading && <div style={{padding:'10px 12px',borderRadius:'12px',fontSize:'13px',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.4)',marginRight:'24px'}}>Thinking...</div>}
              <div ref={chatEndRef}/>
            </div>
            <div style={{marginTop:'12px',display:'flex',gap:'6px'}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&askAi()}
                placeholder="Ask anything..."
                style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'9px 12px',outline:'none',color:'#f5f5f5',fontSize:'13px'}}/>
              <button onClick={askAi} disabled={aiLoading}
                style={{background:'#D4537E',border:'none',borderRadius:'10px',padding:'9px 14px',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:'13px',opacity:aiLoading?.6:1}}>
                Ask
              </button>
            </div>
            <p style={{fontSize:'11px',color:'rgba(255,255,255,.25)',marginTop:'8px',textAlign:'center'}}>Add OPENAI_API_KEY in Vercel for full AI</p>
          </div>

        </div>
      </div>
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
      
      {/* Category + priority badges */}
      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
        <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'99px',background:`${catColors[task.category]}22`,color:catColors[task.category],border:`1px solid ${catColors[task.category]}44`}}>
          {task.category}
        </span>
        <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'99px',background:`${priColors[task.priority]}22`,color:priColors[task.priority],border:`1px solid ${priColors[task.priority]}44`}}>
          {task.priority}
        </span>
        {isOverdue && <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'99px',background:'rgba(239,68,68,.15)',color:'#ef4444',border:'1px solid rgba(239,68,68,.3)',marginLeft:'auto'}}>Overdue</span>}
      </div>

      {/* Title */}
      <input value={task.title} onChange={e=>updateTask(task.id,{title:e.target.value})}
        style={{background:'transparent',border:'none',outline:'none',fontWeight:600,fontSize:'13px',color:'#f5f5f5',width:'100%',marginBottom:'6px'}}/>

      {/* Notes */}
      <textarea value={task.notes||''} onChange={e=>updateTask(task.id,{notes:e.target.value})}
        placeholder="Add notes..."
        style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',outline:'none',width:'100%',fontSize:'12px',padding:'7px 8px',color:'rgba(255,255,255,.6)',resize:'none',minHeight:'48px',lineHeight:1.5}}/>

      {/* Fields */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginTop:'7px'}}>
        <select value={task.category} onChange={e=>updateTask(task.id,{category:e.target.value as Category})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 7px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={task.priority} onChange={e=>updateTask(task.id,{priority:e.target.value as Priority})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 7px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}>
          {priorities.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <input value={task.assignee||''} onChange={e=>updateTask(task.id,{assignee:e.target.value})}
          placeholder="Assignee"
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 7px',fontSize:'11px',color:'rgba(255,255,255,.7)',outline:'none'}}/>
        <input type="date" value={task.dueDate||''} onChange={e=>updateTask(task.id,{dueDate:e.target.value})}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',padding:'5px 7px',fontSize:'11px',color:isOverdue?'#ef4444':'rgba(255,255,255,.7)',outline:'none'}}/>
      </div>

      {/* Delete */}
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:'8px'}}>
        <button onClick={()=>deleteTask(task.id)}
          style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',padding:'2px 4px',borderRadius:'6px'}}>
          <Trash2 size={11}/>Delete
        </button>
      </div>
    </article>
  );
}
