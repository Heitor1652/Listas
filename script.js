// app.js - ToDo List simples com LocalStorage
(() => {
  const STORAGE_KEY = 'todo.tasks.v1';

  // DOM
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const list = document.getElementById('task-list');
  const totalCountEl = document.getElementById('total-count');
  const doneCountEl = document.getElementById('done-count');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const exportBtn = document.getElementById('export');
  const importBtn = document.getElementById('import');
  const importFile = document.getElementById('import-file');

  let tasks = loadTasks(); // array de { id, title, done, createdAt }
  let filter = 'all'; // all | active | completed

  // ---------- Inicialização ----------
  render();

  // ---------- Eventos ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const id = e.target.closest('.task-item')?.dataset?.id;
    if (!id) return;

    if (e.target.matches('.toggle-btn')) {
      toggleDone(id);
    } else if (e.target.matches('.delete-btn')) {
      removeTask(id);
    } else if (e.target.matches('.edit-btn')) {
      startEdit(id);
    }
  });

  // Delegação para salvar edição (blur + enter)
  list.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.edit-input')) {
      e.target.blur();
    } else if (e.key === 'Escape' && e.target.matches('.edit-input')) {
      render(); // cancela edição
    }
  });

  list.addEventListener('focusout', (e) => {
    if (e.target.matches('.edit-input')) {
      finishEdit(e.target.closest('.task-item')?.dataset?.id, e.target.value.trim());
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      // aria-selected
      filterBtns.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      render();
    });
  });

  clearCompletedBtn.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    render();
  });

  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('Formato inválido');
        // opcional: valida cada item
        tasks = imported.map((t, i) => ({
          id: String(t.id ?? `imp-${Date.now()}-${i}`),
          title: String(t.title ?? ''),
          done: Boolean(t.done),
          createdAt: t.createdAt ?? new Date().toISOString()
        }));
        saveTasks();
        render();
      } catch (err) {
        alert('Falha ao importar JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reseta input
  });

  // ---------- Funções de Manipulação ----------
  function addTask(title) {
    const task = {
      id: String(Date.now()),
      title,
      done: false,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(task); // mostra no topo
    saveTasks();
    render();
  }

  function toggleDone(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks();
    render();
  }

  function removeTask(id) {
    if (!confirm('Remover esta tarefa?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  function startEdit(id) {
    const item = document.querySelector(`.task-item[data-id="${id}"]`);
    if (!item) return;
    const titleEl = item.querySelector('.title');
    const current = titleEl.textContent;
    titleEl.innerHTML = `<input class="edit-input" aria-label="Editar tarefa" value="${escapeHtml(current)}" />`;
    const inputEl = item.querySelector('.edit-input');
    inputEl.focus();
    // move caret to end
    inputEl.setSelectionRange(current.length, current.length);
  }

  function finishEdit(id, newValue) {
    if (!id) return;
    if (!newValue) {
      // se editou para vazio, remover
      tasks = tasks.filter(t => t.id !== id);
    } else {
      tasks = tasks.map(t => t.id === id ? { ...t, title: newValue } : t);
    }
    saveTasks();
    render();
  }

  // ---------- Render ----------
  function render() {
    const visible = tasks.filter(t => {
      if (filter === 'active') return !t.done;
      if (filter === 'completed') return t.done;
      return true;
    });

    // limpa
    list.innerHTML = '';

    if (visible.length === 0) {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.innerHTML = `<div class="title">Nenhuma tarefa</div>`;
      list.appendChild(li);
    } else {
      visible.forEach(t => {
        const li = document.createElement('li');
        li.className = `task-item ${t.done ? 'completed' : ''}`;
        li.dataset.id = t.id;
        li.innerHTML = `
          <input class="toggle-btn" type="checkbox" ${t.done ? 'checked' : ''} aria-label="Marcar tarefa" />
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="task-actions">
            <button class="icon-btn edit-btn" title="Editar" aria-label="Editar tarefa">✏️</button>
            <button class="icon-btn delete-btn" title="Excluir" aria-label="Excluir tarefa">🗑️</button>
          </div>
        `;
        // checkbox click should toggle
        const checkbox = li.querySelector('.toggle-btn');
        checkbox.addEventListener('click', (e) => {
          toggleDone(t.id);
        });
        list.appendChild(li);
      });
    }

    totalCountEl.textContent = tasks.length;
    doneCountEl.textContent = tasks.filter(t => t.done).length;
  }

  // ---------- Storage ----------
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Não foi possível salvar no localStorage', e);
    }
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.error('Erro ao carregar tarefas', e);
      return [];
    }
  }

  // ---------- Utils ----------
  function escapeHtml(str) {
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;');
  }
})();
