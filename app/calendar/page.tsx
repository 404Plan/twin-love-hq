'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Task } from '@/lib/types';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const API = SUPABASE_URL && SUPABASE_KEY ? `${SUPABASE_URL}/rest/v1/tasks` : null;
const HEADERS = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

const catColors: Record<string,string> = {
  Release:'#D4537E', Artist:'#3b82f6', Marketing:'#f59e0b',
  Legal:'#22c55e', Studio:'#8b5cf6', Finance:'#14b8a6', Admin:'#6b7280'
};
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number|null>(null);

  useEffect(() => {
    async function load() {
      if (API) {
        try {
          const r = await fetch(`${API}?order=due_date.asc`, { headers: HEADERS });
          const data = await r.json();
          setTasks(data.map((t: any) => ({
            id:t.id, title:t.title, notes:t.notes||'', category:t.category||'Admin',
            status:t.status||'todo', priority:t.priority||'medium', assignee:t.assignee||'',
            dueDate:t.due_date||'', createdAt:t.created_at, updatedAt:t.updated_at
          })));
        } catch {}
      } else {
        const saved = localStorage.getItem('tl_tasks');
        if (saved) setTasks(JSON.parse(saved));
      }
      setLoading(false);
    }
    load();
  }, []);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => { if (t.dueDate) { if (!map[t.dueDate]) map[t.dueDate] = []; map[t.dueDate].push(t); } });
    return map;
  }, [tasks]);

  const selectedDate = selectedDay ? `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : null;
  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];

  const upcoming = useMemo(() => {
    const now = new Date(); const future = new Date(); future.setDate(future.getDate()+30);
    return tasks.filter(t=>t.dueDate&&t.status!=='done').filter(t=>{ const d=new Date(t.dueDate!); return d>=now&&d<=future; }).sort((a,b)=>a.dueDate!.localeCompare(b.dueDate!)).slice(0,8);
  }, [tasks]);

  function prevMonth() { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); setSelectedDay(null); }
  function nextMonth() { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); setSelectedDay(null); }

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <main style={{minHeight:'100vh',background:'radial-gradient(circle at 20% 20%, rgba(210,32,70,.28), transparent 40%), #08080a',padding:'20px',fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif',color:'#f5f5f5'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px'}}>
          <Link href="/" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'10px',padding:'8px 12px',color:'#f5f5f5',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
            <ArrowLeft size={14}/>Board
          </Link>
          <div>
            <p style={{fontSize:'10px',letterSpacing:'.2em',color:'#D4537E',textTransform:'uppercase',margin:0}}>Twin Love</p>
            <h1 style={{fontSize:'24px',fontWeight:900,margin:0}}>Calendar</h1>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:'16px',alignItems:'start'}}>
          {/* Calendar */}
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <button onClick={prevMonth} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:'8px',padding:'7px 10px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center'}}><ChevronLeft size={16}/></button>
              <h2 style={{margin:0,fontSize:'18px',fontWeight:700}}>{MONTHS[viewMonth]} {viewYear}</h2>
              <button onClick={nextMonth} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:'8px',padding:'7px 10px',color:'#f5f5f5',cursor:'pointer',display:'flex',alignItems:'center'}}><ChevronRight size={16}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'8px'}}>
              {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:600,color:'rgba(255,255,255,.4)',padding:'4px 0',textTransform:'uppercase'}}>{d}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}}>
              {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{minHeight:'72px'}}/>)}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const day=i+1;
                const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayTasks=tasksByDate[dateStr]||[];
                const isToday=dateStr===todayStr;
                const isSelected=day===selectedDay;
                return (
                  <div key={day} onClick={()=>setSelectedDay(day===selectedDay?null:day)}
                    style={{minHeight:'72px',borderRadius:'10px',padding:'6px',cursor:dayTasks.length>0?'pointer':'default',transition:'all .15s',
                      background:isSelected?'rgba(212,83,126,.2)':isToday?'rgba(255,255,255,.07)':'rgba(255,255,255,.02)',
                      border:isSelected?'1px solid #D4537E':isToday?'1px solid rgba(255,255,255,.15)':'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{fontSize:'12px',fontWeight:isToday?700:400,color:isToday?'#D4537E':'rgba(255,255,255,.6)',marginBottom:'4px'}}>{day}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                      {dayTasks.slice(0,2).map(t=>(
                        <div key={t.id} style={{fontSize:'10px',padding:'2px 5px',borderRadius:'4px',background:`${catColors[t.category]}33`,color:catColors[t.category],whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.6:1}}>{t.title}</div>
                      ))}
                      {dayTasks.length>2&&<div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',paddingLeft:'4px'}}>+{dayTasks.length-2} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'16px',paddingTop:'16px',borderTop:'1px solid rgba(255,255,255,.07)'}}>
              {Object.entries(catColors).map(([cat,color])=>(
                <div key={cat} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'rgba(255,255,255,.5)'}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:color,display:'inline-block'}}/>{cat}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {selectedDay&&(
              <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(212,83,126,.3)',borderRadius:'14px',padding:'16px'}}>
                <h3 style={{margin:'0 0 12px',fontSize:'14px',fontWeight:700,color:'#D4537E'}}>{MONTHS[viewMonth]} {selectedDay}</h3>
                {selectedTasks.length===0?<p style={{fontSize:'13px',color:'rgba(255,255,255,.3)',margin:0}}>Nothing due this day</p>:(
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {selectedTasks.map(t=>(
                      <div key={t.id} style={{background:'rgba(255,255,255,.05)',borderRadius:'10px',padding:'10px',borderLeft:`3px solid ${catColors[t.category]}`}}>
                        <div style={{fontSize:'13px',fontWeight:600,marginBottom:'4px',textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.6:1}}>{t.title}</div>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'99px',background:`${catColors[t.category]}22`,color:catColors[t.category]}}>{t.category}</span>
                          <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'99px',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)'}}>{t.status}</span>
                          {t.assignee&&<span style={{fontSize:'10px',color:'rgba(255,255,255,.4)'}}>{t.assignee}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'14px',padding:'16px'}}>
              <h3 style={{margin:'0 0 12px',fontSize:'14px',fontWeight:700}}>Upcoming (30 days)</h3>
              {loading?<p style={{fontSize:'13px',color:'rgba(255,255,255,.3)',margin:0}}>Loading...</p>:upcoming.length===0?<p style={{fontSize:'13px',color:'rgba(255,255,255,.3)',margin:0}}>Nothing coming up</p>:(
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {upcoming.map(t=>{
                    const d=new Date(t.dueDate!+'T12:00:00');
                    const isOverdue=d<today;
                    return (
                      <div key={t.id} style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                        <div style={{textAlign:'center',minWidth:'38px',background:'rgba(255,255,255,.06)',borderRadius:'8px',padding:'5px 4px'}}>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,.4)',textTransform:'uppercase'}}>{MONTHS[d.getMonth()].slice(0,3)}</div>
                          <div style={{fontSize:'17px',fontWeight:700,color:isOverdue?'#ef4444':'#f5f5f5',lineHeight:1.1}}>{d.getDate()}</div>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'12px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                          <div style={{fontSize:'11px',color:catColors[t.category],marginTop:'2px'}}>{t.category} · {t.assignee||'Unassigned'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
