import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');

const EMPTY_FORM = {
  title: '',
  description: '',
  owner: '',
  priority: 'medium',
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') {
      return tasks;
    }

    return tasks.filter((task) => task.status === statusFilter);
  }, [statusFilter, tasks]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      inProgress: tasks.filter((task) => task.status === 'in-progress').length,
      done: tasks.filter((task) => task.status === 'done').length,
    };
  }, [tasks]);

  async function loadTasks() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load tasks');
      }

      setTasks(payload.tasks);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setBanner('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create task');
      }

      setTasks((currentTasks) => [payload.task, ...currentTasks]);
      setForm(EMPTY_FORM);
      setBanner('Task created and ready for the team.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTaskStatus(task, nextStatus) {
    setError('');
    setBanner('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update task');
      }

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) => (currentTask.id === task.id ? payload.task : currentTask))
      );
      setBanner(`Task moved to ${labelForStatus(nextStatus)}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteTask(taskId) {
    setError('');
    setBanner('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to delete task');
      }

      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      setBanner('Task removed from the board.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">DevOps Task Manager</span>
          <h1>Ship visible work, not placeholder screens.</h1>
          <p>
            Track release tasks, move work across the board, and keep the frontend wired to the
            backend service the whole way through delivery.
          </p>
        </div>

        <div className="hero-panel">
          <div className="stat-card">
            <span>Total Tasks</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span>Todo</span>
            <strong>{stats.todo}</strong>
          </div>
          <div className="stat-card">
            <span>In Progress</span>
            <strong>{stats.inProgress}</strong>
          </div>
          <div className="stat-card">
            <span>Done</span>
            <strong>{stats.done}</strong>
          </div>
        </div>
      </section>

      <main className="workspace">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Create task</h2>
              <p>Give the team a clear next step with ownership and priority.</p>
            </div>
          </div>

          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              Task title
              <input
                name="title"
                value={form.title}
                onChange={handleInputChange(setForm)}
                placeholder="Example: Add Argo CD sync policies"
                required
              />
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange(setForm)}
                rows="4"
                placeholder="What needs to be delivered?"
              />
            </label>

            <div className="form-grid">
              <label>
                Owner
                <input
                  name="owner"
                  value={form.owner}
                  onChange={handleInputChange(setForm)}
                  placeholder="Platform Team"
                />
              </label>

              <label>
                Priority
                <select name="priority" value={form.priority} onChange={handleInputChange(setForm)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create task'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading panel-heading-split">
            <div>
              <h2>Delivery board</h2>
              <p>Tasks are loaded from the backend API and updated live in the UI.</p>
            </div>

            <label className="filter-control">
              Filter
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          </div>

          {banner ? <div className="banner success">{banner}</div> : null}
          {error ? <div className="banner error">{error}</div> : null}

          {loading ? <p className="state-message">Loading tasks from the backend...</p> : null}

          {!loading && filteredTasks.length === 0 ? (
            <p className="state-message">No tasks match this filter yet.</p>
          ) : null}

          <div className="task-list">
            {filteredTasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-card-header">
                  <div>
                    <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                    <span className={`pill status-${task.status}`}>{labelForStatus(task.status)}</span>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => deleteTask(task.id)}>
                    Delete
                  </button>
                </div>

                <h3>{task.title}</h3>
                <p>{task.description || 'No description provided yet.'}</p>

                <dl className="task-meta">
                  <div>
                    <dt>Owner</dt>
                    <dd>{task.owner}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatDate(task.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="task-actions">
                  {task.status !== 'todo' ? (
                    <button type="button" onClick={() => updateTaskStatus(task, 'todo')}>
                      Move to Todo
                    </button>
                  ) : null}
                  {task.status !== 'in-progress' ? (
                    <button type="button" onClick={() => updateTaskStatus(task, 'in-progress')}>
                      Move to In Progress
                    </button>
                  ) : null}
                  {task.status !== 'done' ? (
                    <button type="button" onClick={() => updateTaskStatus(task, 'done')}>
                      Mark Done
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function handleInputChange(setForm) {
  return (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };
}

function labelForStatus(status) {
  if (status === 'in-progress') {
    return 'In Progress';
  }

  if (status === 'todo') {
    return 'Todo';
  }

  return 'Done';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default App;
