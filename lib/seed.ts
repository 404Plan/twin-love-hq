import { Task } from './types';

export const seedTasks: Task[] = [
  { id:'1', title:'Finalize Song Wars headcount for Ginos', notes:'Manager asked for approximate headcount, setup time, and security.', category:'Marketing', status:'todo', priority:'high', assignee:'Eric', dueDate:'2026-06-02', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:'2', title:'Set up BMI / publishing royalty checklist', notes:'Track writer accounts, publisher setup, artist splits, and documentation.', category:'Finance', status:'progress', priority:'high', assignee:'Eric', dueDate:'2026-06-04', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:'3', title:'Build artist royalty tracking sheet', notes:'Music only for now: song, artist, producers, splits, distributor, PRO, MLC.', category:'Finance', status:'todo', priority:'high', assignee:'Eric', dueDate:'2026-06-07', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:'4', title:'Producer Combine task list', notes:'Round 1 Drum Pattern Drill, Round 2 Flip Drill, Round 3 Collaboration Drill.', category:'Studio', status:'review', priority:'medium', assignee:'Twin Trax', dueDate:'2026-06-10', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() },
  { id:'5', title:'Organize beat preview clips', notes:'Trim beats into 30–45 second previews before uploading to site.', category:'Release', status:'todo', priority:'medium', assignee:'Eric', dueDate:'2026-06-12', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
];
