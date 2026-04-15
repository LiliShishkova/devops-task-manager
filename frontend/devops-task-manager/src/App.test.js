import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url, options = {}) => {
      if (url === '/api/tasks' && (!options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              tasks: [
                {
                  id: 'task-1',
                  title: 'Deploy observability stack',
                  description: 'Install kube-prometheus-stack and Loki.',
                  owner: 'SRE',
                  priority: 'high',
                  status: 'in-progress',
                  updatedAt: '2026-04-15T10:00:00.000Z',
                },
              ],
            }),
        });
      }

      if (url === '/api/tasks' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              task: {
                id: 'task-2',
                title: 'Create frontend board',
                description: 'Replace the starter screen.',
                owner: 'Frontend',
                priority: 'medium',
                status: 'todo',
                updatedAt: '2026-04-15T11:00:00.000Z',
              },
            }),
        });
      }

      if (url === '/api/tasks/task-1' && options.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              task: {
                id: 'task-1',
                title: 'Deploy observability stack',
                description: 'Install kube-prometheus-stack and Loki.',
                owner: 'SRE',
                priority: 'high',
                status: 'done',
                updatedAt: '2026-04-15T12:00:00.000Z',
              },
            }),
        });
      }

      if (url === '/api/tasks/task-1' && options.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
        });
      }

      return Promise.reject(new Error(`Unhandled fetch call: ${url}`));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('loads tasks from the backend', async () => {
    render(<App />);

    expect(screen.getByText(/loading tasks from the backend/i)).toBeInTheDocument();
    expect(await screen.findByText(/deploy observability stack/i)).toBeInTheDocument();
    expect(screen.getByText(/sre/i)).toBeInTheDocument();
  });

  test('creates a task from the form', async () => {
    render(<App />);

    await screen.findByText(/deploy observability stack/i);

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Create frontend board' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Replace the starter screen.' },
    });
    fireEvent.change(screen.getByLabelText(/owner/i), {
      target: { value: 'Frontend' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    expect(await screen.findByText(/task created and ready for the team/i)).toBeInTheDocument();
    expect(screen.getByText(/create frontend board/i)).toBeInTheDocument();
  });

  test('updates task status', async () => {
    render(<App />);

    await screen.findByText(/deploy observability stack/i);
    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));

    await waitFor(() => {
      expect(screen.getByText(/task moved to done/i)).toBeInTheDocument();
    });
  });
});
