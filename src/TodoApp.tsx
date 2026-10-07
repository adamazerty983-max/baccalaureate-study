import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, CalendarDays, Check, CheckCheck, ChevronDown, Circle, Cloud, CloudOff, ListTodo, Plus, Search, Settings2, Sparkles, Sun, Trash2 } from 'lucide-react';

type Todo = { id: string; title: string; done: boolean; priority: 'low' | 'medium' | 'high'; due?: string; created: number };
type Filter = 'Today' | 'Upcoming' | 'All tasks' | 'Completed';
declare global { interface Window { puter?: any } }
const STORAGE_KEY = 'daymark.todos.v1';
const CLOUD_KEY = 'daymark.todos.v1';
const todayISO = () => new Date().toISOString().slice(0, 10);
const demoTodos: Todo[] = [
  { id: 'demo-1', title: 'Plan the week ahead', done: false, priority: 'high', due: todayISO(), created: 1 },
  { id: 'demo-2', title: 'Pick up a few things for dinner', done: false, priority: 'medium', due: todayISO(), created: 2 },
  { id: 'demo-3', title: 'Read 20 pages', done: true, priority: 'low', due: todayISO(), created: 3 },
];

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : demoTodos; } catch { return demoTodos; }
  });
  const [filter, setFilter] = useState<Filter>('Today');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [due, setDue] = useState(todayISO());
  const [signedIn, setSignedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }, [todos]);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!window.puter?.auth) return;
      try {
        if (await window.puter.auth.isSignedIn()) {
          const data = await window.puter.kv.get(CLOUD_KEY);
          if (!alive) return;
          setSignedIn(true);
          if (data) { const remote = typeof data === 'string' ? JSON.parse(data) : data; if (Array.isArray(remote)) setTodos(remote); }
        }
      } catch { /* Keep the local list available if cloud storage is unavailable. */ }
    };
    check(); return () => { alive = false; };
  }, []);
  const completed = todos.filter(t => t.done).length;
  const visibleTodos = useMemo(() => todos.filter(todo => {
    if (filter === 'Today' && (todo.due !== todayISO() || todo.done)) return false;
    if (filter === 'Upcoming' && (!todo.due || todo.due <= todayISO() || todo.done)) return false;
    if (filter === 'Completed' && !todo.done) return false;
    return todo.title.toLowerCase().includes(query.toLowerCase());
  }).sort((a,b) => Number(a.done)-Number(b.done) || ({ high:0,medium:1,low:2 }[a.priority]-({ high:0,medium:1,low:2 }[b.priority])) || a.created-b.created), [todos, filter, query]);
  const addTodo = (event: FormEvent) => {
    event.preventDefault(); if (!draft.trim()) return;
    setTodos(prev => [{ id: crypto.randomUUID(), title: draft.trim(), done: false, priority, due: due || undefined, created: Date.now() }, ...prev]);
    setDraft(''); setAdding(false); setPriority('medium'); setDue(todayISO());
  };
  const toggle = (id: string) => setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo));
  const sync = async () => {
    if (!window.puter) { setNotice('Puter could not load. Check your connection and try again.'); return; }
    setSyncing(true);
    try {
      if (!signedIn) { await window.puter.auth.signIn(); setSignedIn(true); }
      const stored = await window.puter.kv.get(CLOUD_KEY);
      if (stored) {
        const remote: Todo[] = typeof stored === 'string' ? JSON.parse(stored) : stored;
        const merged = new Map<string, Todo>(); [...(Array.isArray(remote) ? remote : []), ...todos].forEach(t => merged.set(t.id, t));
        const list = [...merged.values()]; setTodos(list); await window.puter.kv.set(CLOUD_KEY, JSON.stringify(list));
      } else await window.puter.kv.set(CLOUD_KEY, JSON.stringify(todos));
      setNotice('Your tasks are synced with Puter.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not sync right now.'); }
    finally { setSyncing(false); setTimeout(() => setNotice(''), 3200); }
  };
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const nav: { label: Filter; icon: typeof Sun; count?: number }[] = [
    { label: 'Today', icon: Sun, count: todos.filter(t => t.due === todayISO() && !t.done).length },
    { label: 'Upcoming', icon: CalendarDays, count: todos.filter(t => !!t.due && t.due > todayISO() && !t.done).length },
    { label: 'All tasks', icon: ListTodo, count: todos.filter(t => !t.done).length },
    { label: 'Completed', icon: CheckCheck, count: completed },
  ];
  return <div className="daymark-shell">
    <aside className="sidebar">
      <a className="brand" href="./todo.html"><span className="brand-mark"><Check size={19}/></span><span>daymark<span className="brand-dot">.</span></span></a>
      <div className="workspace"><div className="workspace-avatar">D</div><div><strong>My space</strong><small>Personal workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-caption">MENU</div>
      <nav>{nav.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => setFilter(label)} className={`nav-item ${filter === label ? 'active' : ''}`}><Icon size={18}/><span>{label}</span><span className="nav-count">{count || ''}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={16}/><strong>A little progress<br/>adds up.</strong><span>Keep showing up for yourself.</span><div className="tip-progress"><i style={{ width: `${todos.length ? Math.round(completed / todos.length * 100) : 0}%` }}/></div><small>{completed} of {todos.length} tasks done</small></div><button className="nav-item settings"><Settings2 size={18}/><span>Preferences</span></button><div className="profile"><div className="profile-avatar">Y</div><div><strong>Your day</strong><small>{signedIn ? 'Puter connected' : 'Local workspace'}</small></div><span className="profile-menu">···</span></div></div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div className="breadcrumb">My space <span>/</span> <strong>{filter}</strong></div><div className="top-actions"><span className="sync-status">{signedIn ? <Cloud size={15}/> : <CloudOff size={15}/>} {signedIn ? 'Synced' : 'Saved locally'}</span><button className="sync-button" onClick={sync} disabled={syncing}><Cloud size={16}/>{syncing ? 'Connecting…' : signedIn ? 'Sync now' : 'Connect Puter'}</button></div></header>
      <section className="content"><div className="page-kicker">{dateLabel}</div><div className="title-row"><div><h1>{filter === 'Today' ? 'Today' : filter}</h1><p>{filter === 'Today' ? 'A fresh page. Make it count.' : filter === 'Upcoming' ? 'Good things are worth planning for.' : 'Everything you need, all in one place.'}</p></div><button className="add-primary" onClick={() => setAdding(true)}><Plus size={18}/> New task</button></div>
        <div className="overview"><div className="overview-icon"><ListTodo size={19}/></div><div className="overview-copy"><strong>{filter === 'Today' ? 'Your daily focus' : `${filter} list`}</strong><span>{visibleTodos.length} {visibleTodos.length === 1 ? 'task' : 'tasks'} to take care of</span></div><div className="overview-right"><span className="overview-percent">{todos.length ? Math.round(completed / todos.length * 100) : 0}%</span><div className="overview-track"><i style={{ width: `${todos.length ? completed / todos.length * 100 : 0}%` }}/></div></div></div>
        <div className="list-toolbar"><div className="section-heading"><h2>{filter === 'Completed' ? 'Finished' : 'Tasks'}</h2><span>{visibleTodos.length}</span></div><label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a task..."/><kbd>⌘ K</kbd></label></div>
        <div className="task-list">{adding && <form className="task-row add-row" onSubmit={addTodo}><button type="submit" className="task-check add-check"><Plus size={17}/></button><div className="task-main"><input autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="What needs to get done?"/><div className="add-options"><label>Priority <select value={priority} onChange={e => setPriority(e.target.value as Todo['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label><CalendarDays size={13}/><input aria-label="Due date" type="date" value={due} onChange={e => setDue(e.target.value)}/></label></div></div><button className="save-task" type="submit">Add task</button><button className="cancel-task" type="button" onClick={() => setAdding(false)}>Cancel</button></form>}
          {visibleTodos.map(todo => <article className={`task-row ${todo.done ? 'is-done' : ''}`} key={todo.id}><button className={`task-check ${todo.done ? 'checked' : ''}`} onClick={() => toggle(todo.id)} aria-label={todo.done ? 'Mark as active' : 'Complete task'}>{todo.done ? <Check size={15}/> : <Circle size={19}/>}</button><div className="task-main"><div className="task-title">{todo.title}</div><div className="task-meta"><span className={`priority ${todo.priority}`}><i/>{todo.priority}</span>{todo.due && <span className="due"><CalendarDays size={13}/>{todo.due === todayISO() ? 'Today' : new Intl.DateTimeFormat('en', { month:'short', day:'numeric' }).format(new Date(`${todo.due}T12:00:00`))}</span>}</div></div><button className="delete-task" onClick={() => setTodos(prev => prev.filter(t => t.id !== todo.id))} aria-label="Delete task"><Trash2 size={16}/></button></article>)}
          {visibleTodos.length === 0 && !adding && <div className="empty-state"><div className="empty-icon"><Archive size={22}/></div><strong>{query ? 'No matching tasks' : filter === 'Completed' ? 'Nothing completed yet' : 'All clear for now'}</strong><span>{query ? 'Try another search.' : 'Take a breath, or add something new.'}</span>{!query && filter !== 'Completed' && <button onClick={() => setAdding(true)}><Plus size={15}/> Add a task</button>}</div>}
        </div>
        {visibleTodos.length > 0 && <button className="inline-add" onClick={() => setAdding(true)}><Plus size={16}/> Add a task</button>}
        <div className="focus-note"><span className="note-sparkle"><Sparkles size={16}/></span><span><strong>Make room for what matters.</strong><small>One task at a time is still moving forward.</small></span></div>
      </section>
      <footer><span>Designed for a calmer day.</span><a href="https://developer.puter.com" target="_blank" rel="noreferrer">Powered by Puter</a></footer>
      {notice && <div className="toast"><Check size={16}/>{notice}</div>}
    </main>
  </div>;
}
