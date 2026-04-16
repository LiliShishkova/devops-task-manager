# DevOps Task Manager

- `backend/` exposes a task API with CRUD endpoints, `/health`, and `/metrics`
- `frontend/devops-task-manager/` renders a task dashboard and talks to the backend
- `docker-compose.yml` runs the connected app locally
- `k8s/` contains app, ingress, Argo CD, Prometheus, Grafana, and Loki-related manifests
- `.github/workflows/ci.yaml` tests backend and frontend, validates manifests, and builds images

## What was added

- Real backend task routes:
  - `GET /health`
  - `GET /metrics`
  - `GET /api/tasks`
  - `POST /api/tasks`
  - `PATCH /api/tasks/:id`
  - `DELETE /api/tasks/:id`
- File-backed task storage in `backend/data/tasks.json`
- Better backend tests for task storage, validation, and metrics
- Real React task board with create, update, delete, filtering, and status cards
- Frontend tests for loading, create flow, and status updates
- Multi-stage frontend Docker image with Nginx proxying `/api` to the backend
- Kubernetes manifests with probes, resources, ingress, `ServiceMonitor`, `PrometheusRule`, Grafana dashboard config, and Argo CD applications

## Local run

## One-time setup

Install the git hook once in this repo so commits actually run the configured checks:

```bash
pre-commit install
```

You can test the hook manually on the files you changed with:

```bash
pre-commit run --files path/to/file1 path/to/file2
```

### Option 1: run each app separately

Backend:

```bash
cd backend
npm ci
npm start
```

Frontend:

```bash
cd frontend/devops-task-manager
npm ci
PORT=3001 REACT_APP_API_BASE_URL=http://localhost:3000 npm start
```

Open `http://localhost:3000` for the API and `http://localhost:3000/health` for health checks.
Open `http://localhost:3000/metrics` for Prometheus-style metrics.
Open the React app on `http://localhost:3001`.

### Option 2: run the connected stack with Docker Compose

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api/tasks`
- Backend health: `http://localhost:3000/health`
- Backend metrics: `http://localhost:3000/metrics`

## Test commands

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend/devops-task-manager
npm test -- --watch=false
npm run build
```

## CI/CD flow

The GitHub Actions workflow now:

- runs backend tests
- runs frontend tests
- builds the frontend bundle
- validates Kubernetes manifests
- builds and pushes backend/frontend Docker images on pushes to `main`

## Kubernetes and GitOps

The `k8s/` folder includes:

- app namespace and services
- backend and frontend deployments
- ingress for the frontend
- `ServiceMonitor` for Prometheus scraping
- `PrometheusRule` alerts for backend availability and latency
- Grafana dashboard provisioning
- Argo CD application for this repo
- Argo CD applications for `kube-prometheus-stack` and `loki-stack`

Before applying these manifests, make sure your cluster has:

- an ingress controller
- Argo CD installed
- Prometheus Operator CRDs available
- access to the Docker images referenced in the manifests

## What you should check manually

1. Start the backend and confirm `GET /health` returns `status: ok`.
2. Open the frontend and confirm the seeded tasks are shown.
3. Create a task in the UI and confirm it appears immediately.
4. Move a task between `Todo`, `In Progress`, and `Done`.
5. Delete a task and confirm it disappears.
6. Open `/metrics` and confirm the custom metrics are present.
7. Run both test suites and confirm they pass.
8. If you deploy to Kubernetes, confirm Prometheus sees the backend target and Grafana loads the dashboard config.

## Notes

- The Alertmanager secret manifest uses `${DISCORD_WEBHOOK_URL}` as a placeholder. Replace it with your secret management approach before applying in a real cluster.
