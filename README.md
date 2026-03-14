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
