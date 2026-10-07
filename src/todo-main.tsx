import React from 'react';
import { createRoot } from 'react-dom/client';
import TodoApp from './TodoApp';
import './todo.css';

createRoot(document.getElementById('todo-root')!).render(<React.StrictMode><TodoApp /></React.StrictMode>);
