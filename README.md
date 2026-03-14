# ActiveMQ Dashboard

A modern, open-source management UI for **Apache ActiveMQ Classic** — built to replace the outdated default web console with a fast, readable, and operator-friendly interface.

![Dashboard](docs/screenshot-dashboard.png)

---

## Why this instead of the default console?

The built-in ActiveMQ web console works, but it shows its age. This dashboard was built from scratch to fix the things that matter in day-to-day operations:

| | Default Console | This Dashboard |
|---|---|---|
| **Design** | Java-era table UI | Clean dark/light mode, shadcn/ui |
| **Auto-refresh** | Manual page reload | Live refresh every 10 seconds |
| **DLQ handling** | No visual distinction | DLQ badge, per-message retry button |
| **Message browser** | Basic text dump | Structured viewer with properties |
| **Send messages** | Simple form | Full JMS headers, scheduling, persistence |
| **Scheduled jobs** | Raw JMX output | Human-readable table with local timezone |
| **Connections** | Mixed view | Split transport connectors / active connections |
| **Network connectors** | Buried in XML | Dedicated tab with status |
| **Queue search** | None | Instant client-side filter |
| **API** | No REST API | Clean JSON REST API (`/api/v1/...`) |
| **Deployment** | Bundled with broker | Independent Docker service |

---

## Screenshots

### Dashboard
Real-time broker health — memory, store, temp usage, top queues by size.

![Dashboard](docs/screenshot-dashboard.png)

### Queues
Full queue list with search, DLQ/TCQ badges, message browser, send, move, purge, and per-message retry.

![Queues](docs/screenshot-queues.png)

### Connections
Transport connector status (AMQP, OpenWire, STOMP, MQTT) and live active client connections.

![Connections](docs/screenshot-connections.png)

### Scheduled Messages
All pending scheduled jobs with next execution time and cron expression, in your local timezone.

![Scheduled](docs/screenshot-scheduled.png)

---

## Features

- **Dashboard** — broker version, uptime, memory/store/temp gauges, top queues by size
- **Queues** — list, search, create, purge; DLQ and TCQ visual badges
- **Message browser** — browse queue contents, view full message body + JMS properties
- **Send messages** — body, custom properties, full JMS headers (correlation ID, reply-to, priority, TTL, delivery mode), scheduling (delay, period, repeat, cron)
- **Move messages** — move any message to another queue
- **DLQ retry** — per-message retry button to requeue directly from a dead-letter queue
- **Topics** — list, search, create; enqueue/dequeue/consumer/producer stats
- **Connections** — transport connectors with protocol badges, active client connections
- **Network** — network connector list with duplex/bridge flags
- **Scheduled** — pending scheduled jobs (next, start, delay, period, repeat, cron) in local timezone
- **Dark / light mode** — persisted to `localStorage`
- **10-second auto-refresh** on all pages

---

## Architecture

```
Browser (React + Vite)
    │  HTTP/JSON
    ▼
Go Backend  (:8080)
    │  Jolokia JMX-over-HTTP
    │  ActiveMQ REST API
    ▼
Apache ActiveMQ Classic  (:8161)
```

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router v6
- **Backend** — Go 1.22, chi router, clean handlers → services → clients architecture
- **Broker** — Apache ActiveMQ Classic 5.x (Jolokia must be enabled, which it is by default)

---

## Quick Start (Docker Compose)

The fastest way to run everything — ActiveMQ + backend + frontend — in one command.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/your-org/activemq-dashboard.git
cd activemq-dashboard
```

### 2. Start all services

```bash
docker compose up -d
```

This starts:

| Service | Port | Description |
|---|---|---|
| ActiveMQ | `8161` | Web console + Jolokia API |
| ActiveMQ | `61616` | OpenWire (TCP) |
| ActiveMQ | `61613` | STOMP |
| Backend | `8080` | REST API |
| Frontend | `3000` | Dashboard UI |

### 3. Open the dashboard

```
http://localhost:3000
```

Default ActiveMQ credentials: `admin` / `admin`

---

## Connecting to an existing ActiveMQ broker

If you already have ActiveMQ running and only want to run the dashboard against it, skip the bundled broker and configure the backend directly.

### Option A: Docker Compose (backend + frontend only)

Create a `docker-compose.override.yml`:

```yaml
services:
  activemq:
    profiles: ["disabled"]   # do not start the bundled broker

  backend:
    environment:
      ACTIVEMQ_URL: http://your-broker-host:8161
      ACTIVEMQ_USER: admin
      ACTIVEMQ_PASSWORD: your-password
      BROKER_NAME: your-broker-name   # the brokerName in activemq.xml
```

Then:

```bash
docker compose up -d backend frontend
```

### Option B: Environment variables

```bash
export ACTIVEMQ_URL=http://your-broker-host:8161
export ACTIVEMQ_USER=admin
export ACTIVEMQ_PASSWORD=admin
export BROKER_NAME=localhost
export PORT=8080

cd backend && go run ./cmd/server
```

---

## Kubernetes / Enterprise Deployment

For teams running Kubernetes. The broker is assumed to be pre-existing — only the backend and frontend are deployed.

### Prerequisites

- kubectl 1.24+
- Helm 3.10+ (for Option A)
- Docker images pushed to a container registry

### Building and pushing images

Images are published automatically to GitHub Container Registry on every release (see [CI/CD](#cicd--automated-publishing) below). To build and push manually:

```bash
# Backend
docker build -t ghcr.io/your-org/activemq-dashboard-backend:latest ./backend
docker push ghcr.io/your-org/activemq-dashboard-backend:latest

# Frontend
docker build -t ghcr.io/qrowned/modern-activemq-dashboard-frontend:latest ./frontend
docker push ghcr.io/your-org/modern-activemq-dashboard-frontend:latest
```

### Quick install (no build required)

Once images are published, install directly from the Helm repository:

```bash
# Add the Helm repository (once)
helm repo add activemq-dashboard https://your-org.github.io/activemq-dashboard
helm repo update

# Install — point it at your existing broker
helm install my-amq activemq-dashboard/activemq-dashboard \
  --namespace activemq-dashboard --create-namespace \
  --set activemq.url=http://your-broker:8161 \
  --set activemq.user=admin \
  --set activemq.password=your-password \
  --set activemq.brokerName=your-broker-name
```

To upgrade to the latest release:

```bash
helm repo update
helm upgrade my-amq activemq-dashboard/activemq-dashboard --reuse-values
```

### Option A: Helm (recommended)

Install from a local checkout:

```bash
helm install my-amq ./deploy/helm/activemq-dashboard \
  --namespace activemq-dashboard --create-namespace \
  --set activemq.url=http://your-broker:8161 \
  --set activemq.user=admin \
  --set activemq.password=your-password \
  --set activemq.brokerName=your-broker-name
```

Access the dashboard via port-forward:

```bash
kubectl port-forward svc/my-amq-activemq-dashboard-frontend 3000:80 -n activemq-dashboard
# open http://localhost:3000
```

Enable ingress:

```bash
helm upgrade my-amq ./deploy/helm/activemq-dashboard --reuse-values \
  --set ingress.enabled=true \
  --set ingress.host=activemq-dashboard.example.com
```

Enable ingress with TLS via cert-manager:

```bash
helm upgrade my-amq ./deploy/helm/activemq-dashboard --reuse-values \
  --set ingress.enabled=true \
  --set ingress.host=activemq-dashboard.example.com \
  --set ingress.annotations."cert-manager\.io/cluster-issuer"=letsencrypt-prod \
  --set ingress.tls[0].hosts[0]=activemq-dashboard.example.com \
  --set ingress.tls[0].secretName=activemq-dashboard-tls
```

Use an existing Secret (External Secrets Operator / Vault / Sealed Secrets):

```bash
# Pre-create a Secret with keys: ACTIVEMQ_URL, ACTIVEMQ_USER, ACTIVEMQ_PASSWORD, BROKER_NAME
kubectl create secret generic my-amq-creds -n activemq-dashboard \
  --from-literal=ACTIVEMQ_URL=http://your-broker:8161 \
  --from-literal=ACTIVEMQ_USER=admin \
  --from-literal=ACTIVEMQ_PASSWORD=your-password \
  --from-literal=BROKER_NAME=your-broker-name

helm install my-amq ./deploy/helm/activemq-dashboard \
  --namespace activemq-dashboard --create-namespace \
  --set existingSecret=my-amq-creds
```

#### Helm values reference

| Key | Default                                              | Description |
|---|------------------------------------------------------|---|
| `activemq.url` | `http://activemq:8161`                               | ActiveMQ broker URL |
| `activemq.user` | `admin`                                              | Broker username |
| `activemq.password` | `admin`                                              | Broker password |
| `activemq.brokerName` | `localhost`                                          | `brokerName` from activemq.xml |
| `existingSecret` | `""`                                                 | Name of a pre-created Secret (skips chart Secret) |
| `backend.image.repository` | `ghcr.io/qrowned/modern-activemq-dashboard-backend`  | Backend image |
| `backend.image.tag` | `latest`                                             | Backend image tag |
| `backend.replicaCount` | `1`                                                  | Backend replicas |
| `backend.service.port` | `8080`                                               | Backend Service port |
| `frontend.image.repository` | `ghcr.io/qrowned/modern-activemq-dashboard-frontend` | Frontend image |
| `frontend.image.tag` | `latest`                                             | Frontend image tag |
| `frontend.replicaCount` | `1`                                                  | Frontend replicas |
| `frontend.service.port` | `80`                                                 | Frontend Service port |
| `ingress.enabled` | `false`                                              | Create an Ingress resource |
| `ingress.className` | `nginx`                                              | Ingress class |
| `ingress.host` | `activemq-dashboard.example.com`                     | Hostname |
| `ingress.annotations` | `{}`                                                 | Ingress annotations |
| `ingress.tls` | `[]`                                                 | TLS configuration |

### Option B: Kustomize

Edit `deploy/kubernetes/base/secret.yaml` with your base64-encoded credentials:

```bash
echo -n 'http://your-broker:8161' | base64   # ACTIVEMQ_URL
echo -n 'your-password' | base64              # ACTIVEMQ_PASSWORD
echo -n 'your-broker-name' | base64           # BROKER_NAME
```

Then apply an overlay:

```bash
# Staging
kubectl apply -k deploy/kubernetes/overlays/staging

# Production (includes TLS ingress, 2 replicas)
kubectl apply -k deploy/kubernetes/overlays/production
```

Verify:

```bash
kubectl get pods -n activemq-dashboard
kubectl get svc -n activemq-dashboard
kubectl logs -n activemq-dashboard deploy/activemq-dashboard-backend
```

### Verification checklist

```bash
# Health check via exec
kubectl exec -n activemq-dashboard deploy/activemq-dashboard-backend -- \
  wget -qO- http://localhost:8080/api/v1/health

# Port-forward smoke test
kubectl port-forward svc/activemq-dashboard-frontend 3000:80 -n activemq-dashboard
curl -s http://localhost:3000 | grep -c "ActiveMQ"
```

---

## Manual Setup (Development)

### Prerequisites

- Go 1.22+
- Node.js 18+ and npm
- Apache ActiveMQ Classic 5.x running locally

### Backend

```bash
cd backend
go mod download
go run ./cmd/server
# API available at http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:8080` automatically.

To point the frontend at a different backend:

```bash
VITE_API_URL=http://your-backend:8080 npm run dev
```

---

## Configuration Reference

### Backend environment variables

| Variable | Default | Description |
|---|---|---|
| `ACTIVEMQ_URL` | `http://localhost:8161` | ActiveMQ broker base URL (must expose Jolokia) |
| `ACTIVEMQ_USER` | `admin` | Jolokia / REST API username |
| `ACTIVEMQ_PASSWORD` | `admin` | Jolokia / REST API password |
| `BROKER_NAME` | `localhost` | Value of `brokerName` in your `activemq.xml` |
| `PORT` | `8080` | Port the backend listens on |

### Frontend environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Backend base URL |

---

## REST API

The backend exposes a clean JSON API used by the frontend. You can also use it directly from scripts or other tools.

```
GET  /api/v1/health
GET  /api/v1/brokers

GET  /api/v1/queues
POST /api/v1/queues                           { "name": "my.queue" }
GET  /api/v1/queues/{name}/messages
POST /api/v1/queues/{name}/send
POST /api/v1/queues/{name}/move
POST /api/v1/queues/{name}/retry
POST /api/v1/queues/{name}/purge

GET  /api/v1/topics
POST /api/v1/topics                           { "name": "my.topic" }

GET  /api/v1/connections
GET  /api/v1/connections/active

GET  /api/v1/network

GET  /api/v1/scheduled
```

See [`API_SPEC.md`](API_SPEC.md) for full request/response schemas.

---

## Enabling Scheduled Messages

The Scheduled tab requires the ActiveMQ job scheduler plugin. Add `schedulerSupport="true"` to your broker element in `activemq.xml`:

```xml
<broker schedulerSupport="true" brokerName="localhost" ...>
  ...
</broker>
```

Then send messages with `AMQ_SCHEDULED_DELAY`, `AMQ_SCHEDULED_PERIOD`, `AMQ_SCHEDULED_REPEAT`, or `AMQ_SCHEDULED_CRON` headers. The dashboard detects whether the scheduler is enabled and shows an instruction card if it is not.

---

## Simulating Test Data

A Python simulation script is included to populate your broker with realistic test data — queues, DLQs, TCQs, messages of varying sizes, scheduled messages, and tuned resource limits.

```bash
pip install requests
python simulate.py
```

Requires the broker to be running on `http://localhost:8161` with `admin`/`admin`.

---

## Project Structure

```
activemq-dashboard/
├── backend/               Go backend
│   ├── cmd/server/        Entry point (main.go)
│   └── internal/
│       ├── clients/       Jolokia + ActiveMQ REST clients
│       ├── config/        Environment variable loading
│       ├── handlers/      HTTP handlers + router
│       ├── models/        Shared data types
│       └── services/      Business logic per resource
├── frontend/              React frontend
│   └── src/
│       ├── components/    Shared UI components + shadcn/ui
│       ├── hooks/         useAutoRefresh, useTheme, useToast
│       ├── lib/           API client, utilities
│       └── pages/         Dashboard, Queues, Topics, Connections, Network, Scheduled
├── deploy/
│   ├── helm/activemq-dashboard/   Helm chart
│   └── kubernetes/                Kustomize manifests
│       ├── base/                  Base resources
│       └── overlays/
│           ├── production/        TLS ingress, 2 replicas, pinned image tags
│           └── staging/           namePrefix: staging-
├── .github/workflows/     CI/CD: build images + publish Helm chart on release
├── activemq/conf/         activemq.xml for the bundled broker
├── docker-compose.yml
└── simulate.py
```

---

## Requirements

- Apache ActiveMQ Classic **5.x** (tested on 5.18.3)
- Jolokia endpoint enabled (default on all ActiveMQ 5.x installations)
- Docker 20+ for containerised deployment, or Go 1.22+ / Node 18+ for manual setup

---

## License

MIT
