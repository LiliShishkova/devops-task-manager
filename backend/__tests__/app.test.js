const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { validateCreateTask, isValidPriority, isValidStatus } = require('../app');
const { createMetricsTracker } = require('../metrics');
const { createTaskStore } = require('../taskStore');

describe('task store', () => {
  let tempDir;
  let store;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devops-task-manager-'));
    store = createTaskStore({
      dataFile: path.join(tempDir, 'tasks.json'),
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('seeds initial tasks on first read', async () => {
    const tasks = await store.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toHaveProperty('title');
  });

  test('creates, updates, and removes a task', async () => {
    const task = await store.create({
      title: 'Create release checklist',
      description: 'Document the production deployment flow.',
      owner: 'Platform Team',
      priority: 'high',
    });

    expect(task.status).toBe('todo');
    expect(task.id).toBeTruthy();

    const updatedTask = await store.update(task.id, {
      status: 'done',
      owner: 'Release Team',
    });

    expect(updatedTask.status).toBe('done');
    expect(updatedTask.owner).toBe('Release Team');

    const removed = await store.remove(task.id);
    expect(removed).toBe(true);

    const remainingTasks = await store.getAll();
    expect(remainingTasks.some((item) => item.id === task.id)).toBe(false);
  });
});

describe('request validation helpers', () => {
  test('accepts a valid create payload', () => {
    expect(
      validateCreateTask({
        title: 'Deploy frontend',
        description: 'Ship the new board UI.',
        owner: 'Frontend',
        priority: 'medium',
      })
    ).toBeNull();
  });

  test('rejects invalid create payloads', () => {
    expect(validateCreateTask({ title: '' })).toBe('title is required');
    expect(validateCreateTask({ title: 'Valid', priority: 'urgent' })).toBe(
      'priority must be one of low, medium, high'
    );
    expect(isValidPriority('high')).toBe(true);
    expect(isValidPriority('urgent')).toBe(false);
    expect(isValidStatus('done')).toBe(true);
    expect(isValidStatus('blocked')).toBe(false);
  });
});

describe('metrics tracker', () => {
  test('renders Prometheus-style metrics output', () => {
    const tracker = createMetricsTracker();

    tracker.recordRequest({
      statusCode: 200,
      durationMs: 24,
    });
    tracker.recordRequest({
      statusCode: 500,
      durationMs: 100,
    });

    const output = tracker.render({ taskCount: 4 });

    expect(output).toContain('devops_task_manager_requests_total 2');
    expect(output).toContain('devops_task_manager_tasks_total 4');
    expect(output).toContain('devops_task_manager_requests_by_status_total{status="200"} 1');
    expect(output).toContain('devops_task_manager_requests_by_status_total{status="500"} 1');
  });
});
