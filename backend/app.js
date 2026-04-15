const express = require('express');
const { createTaskStore } = require('./taskStore');
const { createMetricsTracker } = require('./metrics');

function createApp(options = {}) {
  const app = express();
  const store = options.store || createTaskStore();
  const metrics = options.metrics || createMetricsTracker();
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }

    return next();
  });

  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      metrics.recordRequest({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'request_completed',
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        })
      );
    });

    next();
  });

  app.get('/health', async (req, res) => {
    const tasks = await store.getAll();

    res.json({
      status: 'ok',
      service: 'devops-task-manager-backend',
      taskCount: tasks.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/metrics', async (req, res) => {
    const tasks = await store.getAll();

    res.type('text/plain');
    res.send(metrics.render({ taskCount: tasks.length }));
  });

  app.get('/api/tasks', async (req, res) => {
    const tasks = await store.getAll();
    res.json({ tasks });
  });

  app.post('/api/tasks', async (req, res) => {
    const validationError = validateCreateTask(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const task = await store.create({
      title: req.body.title,
      description: req.body.description || '',
      owner: req.body.owner || 'Unassigned',
      priority: req.body.priority || 'medium',
    });

    return res.status(201).json({ task });
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }

      updates.title = req.body.title;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      if (typeof req.body.description !== 'string') {
        return res.status(400).json({ error: 'description must be a string' });
      }

      updates.description = req.body.description;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'owner')) {
      if (typeof req.body.owner !== 'string' || !req.body.owner.trim()) {
        return res.status(400).json({ error: 'owner must be a non-empty string' });
      }

      updates.owner = req.body.owner;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'priority')) {
      if (!isValidPriority(req.body.priority)) {
        return res.status(400).json({ error: 'priority must be one of low, medium, high' });
      }

      updates.priority = req.body.priority;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      if (!isValidStatus(req.body.status)) {
        return res.status(400).json({ error: 'status must be one of todo, in-progress, done' });
      }

      updates.status = req.body.status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'provide at least one valid field to update' });
    }

    const task = await store.update(req.params.id, updates);

    if (!task) {
      return res.status(404).json({ error: 'task not found' });
    }

    return res.json({ task });
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const removed = await store.remove(req.params.id);

    if (!removed) {
      return res.status(404).json({ error: 'task not found' });
    }

    return res.status(204).send();
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'route not found' });
  });

  return app;
}

function validateCreateTask(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'request body must be a JSON object';
  }

  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    return 'title is required';
  }

  if (payload.description && typeof payload.description !== 'string') {
    return 'description must be a string';
  }

  if (payload.owner && (typeof payload.owner !== 'string' || !payload.owner.trim())) {
    return 'owner must be a non-empty string';
  }

  if (payload.priority && !isValidPriority(payload.priority)) {
    return 'priority must be one of low, medium, high';
  }

  return null;
}

function isValidPriority(priority) {
  return ['low', 'medium', 'high'].includes(priority);
}

function isValidStatus(status) {
  return ['todo', 'in-progress', 'done'].includes(status);
}

module.exports = {
  createApp,
  validateCreateTask,
  isValidPriority,
  isValidStatus,
};
