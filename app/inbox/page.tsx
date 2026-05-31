'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type QuickItem = {
  id: string;
  text: string;
  type: 'text' | 'email' | 'reply' | 'call' | 'note';
  done: boolean;
  createdAt: string;
};

const typeColors: Record<string, string> = {
  text: '#3b82f6', email: '#f59e0b', reply: '#8b5cf6', call: '#22c55e', note: '#6b7280'
};
const typeLabels: Record<string, string> = {
  text: '💬 Text', email: '📧 Email', reply: '↩️ Reply', call: '📞 Call', note: '📝 Note'
};

export default function InboxPage() {
  const [items, setItems] = useState<QuickItem[]>([]);
  const [input, setInput] = useState('');
  const [type, setType] = useState<QuickItem['type']>('text');
  const [filter, setFilter] = useState<'all'|'active'|'done'>('active');

  useEffect(() => {
    const saved = localStorage.getItem('tl_inbox');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('tl_inbox', JSON.stringify(items));
  }, [items]);

  function addItem() {
    if (!input.trim()) return;
    setItems(prev => [{
      id: crypto.randomUUID(), text: input.trim(), type, done: false, createdAt: new Date().toISOString()
    }, ...prev]);
    setInput('');
  }

  function toggleDone(id: string) {
    setItems(prev => prev.map(i => i.id === id ? {...i, done: !i.done} : i));
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function clearDone() {
    setItems(prev => prev.filter(i => !i.done));
  }

  const filtered = items.filter(i => {
    if (filter === 'active') return !i.done;
    if (filter === 'done') return i.done;
    return true;
  });

  const doneCount = items.filter(i => i.done).length;

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  return (
    <main style={{minHeight:'100vh',background:'radial-gradient(circle at 20% 20%, rgba(210,32,70,.28), transparent 40%), #08080a',padding:'20px',fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif',color:'#f5f5f5'}}>
      <div style={{maxWidth:'680px',margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px'}}>
          <Link href="/" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'8px 12px',color:'#f5f5f5',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
            <ArrowLeft size={14}/>Board
          </Link>
          <div>
            <p style={{fontSize:'10px',letterSpacing:'.2em',color:'#D4537E',textTransform:'uppercase',margin:0}}>Twin Love</p>
            <h1 style={{fontSize:'24px',fontWeight:900,margin:0}}>Quick Inbox</h1>
          </div>
        </div>

        {/* Add item */}
        <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'16px',marginBottom:'16px'}}>
          <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
            {(Object.keys(typeLabels) as QuickItem['type'][]).map(t=>(
              <button key={t} onClick={()=>setType(t)}
                style={{padding:'5px 12px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:500,
                  background:type===t?typeColors[t]:'rgba(255,255,255,.08)',
                  color:type===t?'#fff':'rgba(255,255,255,.6)'}}>
                {typeLabels[t]}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addItem()}
              placeholder={`Add a quick ${type} task...`}
              style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'10px 14px',outline:'none',color:'#f5f5f5',fontSize:'14px'}}/>
            <button onClick={addItem}
              style={{background:'#D4537E',border:'none',borderRadius:'10px',padding:'10px 16px',color:'#fff',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',fontSize:'14px',whiteSpace:'nowrap'}}>
              <Plus size={15}/>Add
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
          <div style={{display:'flex',gap:'6px'}}>
            {(['active','all','done'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'5px 12px',borderRadius:'99px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:500,
                  background:filter===f?'#D4537E':'rgba(255,255,255,.08)',
                  color:filter===f?'#fff':'rgba(255,255,255,.5)',textTransform:'capitalize'}}>
                {f} {f==='active'?`(${items.filter(i=>!i.done).length})`:f==='done'?`(${doneCount})`:''}
              </button>
            ))}
          </div>
          {doneCount > 0 && (
            <button onClick={clearDone} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.3)',fontSize:'12px'}}>
              Clear done
            </button>
          )}
        </div>

        {/* Items */}
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,.25)',fontSize:'14px'}}>
              {filter==='active'?'All caught up! 🎉':'Nothing here yet'}
            </div>
          ) : filtered.map(item=>(
            <div key={item.id}
              style={{background:'rgba(255,255,255,.04)',border:`1px solid ${item.done?'rgba(255,255,255,.05)':'rgba(255,255,255,.09)'}`,borderRadius:'12px',padding:'12px 14px',display:'flex',alignItems:'center',gap:'12px',transition:'all .15s',opacity:item.done?.6:1}}>
              <button onClick={()=>toggleDone(item.id)}
                style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${item.done?'#22c55e':typeColors[item.type]}`,background:item.done?'#22c55e':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                {item.done&&<Check size={11} color='#fff'/>}
              </button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:500,textDecoration:item.done?'line-through':'none',color:item.done?'rgba(255,255,255,.4)':'#f5f5f5',wordBreak:'break-word'}}>
                  {item.text}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'3px'}}>
                  <span style={{fontSize:'11px',color:typeColors[item.type]}}>{typeLabels[item.type]}</span>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,.3)',display:'flex',alignItems:'center',gap:'3px'}}>
                    <Clock size={10}/>{timeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
              <button onClick={()=>deleteItem(item.id)}
                style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.2)',padding:'4px',borderRadius:'6px',display:'flex',alignItems:'center'}}>
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
