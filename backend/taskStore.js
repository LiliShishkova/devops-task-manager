const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

function createTaskStore(options = {}) {
  const dataFile = options.dataFile || process.env.TASKS_FILE || DEFAULT_DATA_FILE;

  return {
    async getAll() {
      const state = await readState(dataFile);
      return state.tasks.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async create(input) {
      const state = await readState(dataFile);
      const now = new Date().toISOString();
      const task = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        description: input.description.trim(),
        owner: input.owner.trim(),
        priority: input.priority,
        status: 'todo',
        createdAt: now,
        updatedAt: now,
      };

      state.tasks.push(task);
      await writeState(dataFile, state);

      return task;
    },

    async update(id, updates) {
      const state = await readState(dataFile);
      const task = state.tasks.find((item) => item.id === id);

      if (!task) {
        return null;
      }

      Object.assign(task, updates, { updatedAt: new Date().toISOString() });
      await writeState(dataFile, state);

      return task;
    },

    async remove(id) {
      const state = await readState(dataFile);
      const initialLength = state.tasks.length;
      state.tasks = state.tasks.filter((task) => task.id !== id);

      if (state.tasks.length === initialLength) {
        return false;
      }

      await writeState(dataFile, state);
      return true;
    },
  };
}

async function readState(dataFile) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.tasks)) {
      return { tasks: [] };
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialState = {
        tasks: [
          {
            id: 'seed-task-1',
            title: 'Wire frontend to backend API',
            description: 'Replace placeholder UI with real task data from the service.',
            owner: 'Platform Team',
            priority: 'high',
            status: 'in-progress',
            createdAt: '2026-04-15T10:00:00.000Z',
            updatedAt: '2026-04-15T10:00:00.000Z',
          },
          {
            id: 'seed-task-2',
            title: 'Add observability stack',
            description: 'Provision Prometheus, Grafana, Loki, and alerting assets.',
            owner: 'SRE',
            priority: 'medium',
            status: 'todo',
            createdAt: '2026-04-15T09:00:00.000Z',
            updatedAt: '2026-04-15T09:00:00.000Z',
          },
        ],
      };

      await writeState(dataFile, initialState);
      return initialState;
    }

    throw error;
  }
}

async function writeState(dataFile, state) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(state, null, 2));
}

module.exports = {
  createTaskStore,
  DEFAULT_DATA_FILE,
};
