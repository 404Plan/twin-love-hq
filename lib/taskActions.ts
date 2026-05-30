import { Category, Task, TaskStatus, Priority } from './types';

const _categories: Category[] = ['Release','Artist','Marketing','Legal','Studio','Finance','Admin'];
const _statuses: TaskStatus[] = ['todo','progress','review','done'];
const _priorities: Priority[] = ['high','medium','low'];

export function applyAiCommand(tasks: Task[], command: string) {
  const now = new Date().toISOString();
  const lower = command.toLowerCase();
  let next = [...tasks];
  let message = '';

  const addMatch = command.match(/add (a )?task (for |called |to )?(.*)/i) || command.match(/create (a )?task (for |called |to )?(.*)/i);
  if (addMatch) {
    const title = (addMatch[3] || command).replace(/tomorrow|today|next week/ig,'').trim().replace(/[.!]$/,'');
    const dueDate = lower.includes('tomorrow') ? dateOffset(1) : lower.includes('today') ? dateOffset(0) : '';
    next.unshift({ id: crypto.randomUUID(), title: title || 'New task', notes: `Added from AI command: ${command}`, category: guessCategory(command), status:'todo', priority: lower.includes('urgent') || lower.includes('high') ? 'high' : 'medium', assignee:'Eric', dueDate, createdAt: now, updatedAt: now });
    message = `Added task: ${title || 'New task'}`;
    return { tasks: next, message };
  }

  if (lower.includes('move overdue') || lower.includes('mark overdue')) {
    next = next.map(t => isOverdue(t.dueDate) && t.status !== 'done' ? { ...t, priority:'high', updatedAt: now } : t);
    message = 'Moved overdue open tasks to high priority.';
    return { tasks: next, message };
  }

  if (lower.includes('focus') || lower.includes('what should i do')) {
    const top = [...tasks].filter(t => t.status !== 'done').sort((a,b) => score(b)-score(a)).slice(0,3);
    message = top.length ? `Top focus: ${top.map(t => t.title).join(' | ')}` : 'Everything is done right now.';
    return { tasks: next, message };
  }

  message = 'I can add tasks, prioritize overdue tasks, and recommend your top focus. For bigger changes, use the board controls.';
  return { tasks: next, message };
}

function dateOffset(days: number) { const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function isOverdue(date?: string) { return !!date && new Date(date) < new Date(new Date().toDateString()); }
function score(t: Task) { return (t.priority === 'high' ? 50 : t.priority === 'medium' ? 25 : 5) + (isOverdue(t.dueDate) ? 100 : 0) + (t.status === 'progress' ? 10 : 0); }
function guessCategory(text: string): Category { const l=text.toLowerCase(); if(l.includes('bmi')||l.includes('royalt')||l.includes('pay'))return 'Finance'; if(l.includes('song wars')||l.includes('promo')||l.includes('ig'))return 'Marketing'; if(l.includes('studio')||l.includes('beat'))return 'Studio'; if(l.includes('contract')||l.includes('legal'))return 'Legal'; if(l.includes('release')||l.includes('album'))return 'Release'; return 'Admin'; }
