# CrewSignal

CrewSignal is a Mars-transit crew health support prototype. It combines a
browser-based crew dashboard and emergency-support flow with a separate
ground-server demo for delayed messages, telemetry ingestion, synchronization,
and audit trails.

> **Prototype only:** CrewSignal is not a medical device and must not be used
> for diagnosis, treatment, or real emergency response. Dashboard vitals are
> simulated, radiation values are static samples, and the backend's demo
> credentials and plain-HTTP transport are not suitable for production or
> sensitive health information.

## Contents

- [Project at a glance](#project-at-a-glance)
- [Features](#features)
- [Architecture and data flow](#architecture-and-data-flow)
- [Technology](#technology)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Backend configuration](#backend-configuration)
- [Backend API overview](#backend-api-overview)
- [Data, privacy, and limitations](#data-privacy-and-limitations)
- [Tests and builds](#tests-and-builds)
- [Repository layout](#repository-layout)

## Project at a glance

| Area | What it does |
| --- | --- |
| Frontend | Next.js crew health dashboard, self-reported daily check-in, reports, dataset import, and emergency voice workflow. |
| Backend | Fastify API backed by SQLite for link state, delayed packets, observations, sync collections, device samples, and tamper-evident audit records. |
| Current integration | The frontend is usable on its own and keeps check-ins on the device. The backend runs as a separate API demo; the current frontend report action does not transmit to it. |

## Features

### Crew dashboard

- Choose among four demo crew profiles: Alex Morgan, Samira Patel, Kenji Sato,
  and Elena Rostova.
- View simulated heart rate, skin temperature, blood pressure, and motion,
  including a scrolling recent timeline, body map, reading details, and sensor
  quality states.
- Change the simulated activity phase (automatic cycle, rest, station duty,
  workout, or recovery) and override sensor quality for demonstrations.
- Review sleep and wellbeing history, complete a daily self-report, and view a
  computed wellbeing summary when enough answers are available.
- Switch between dark and light themes and replay the in-app tutorial.

### Telemetry datasets

- Select from the bundled preset datasets or import a local CSV or JSON file.
- Preview parsed records, download a sample CSV template, and reset a profile
  to its default dataset.
- Use the active dataset's baseline/history and telemetry curve to drive the
  dashboard's simulation.
- Review static environmental/radiation sample values with an on-screen
  disclaimer.

Dataset labels identify the bundled presets and their stated sources; they do
not make the frontend a live NASA data connection or a real sensor client.
Imported and preset curves influence simulated display values.

### Reports and emergency support

- Assemble and download a JSON report containing profile, check-in, sensor
  quality, telemetry source, and symptoms.
- Exclude mood and wellbeing by default; users can explicitly opt them into a
  report.
- Run a guided emergency situation report and private-support flow.
- Use local speech recognition where available (including the bundled English
  Vosk model), browser speech recognition fallback where supported, and
  speech playback. The emergency dialogue is constrained and guarded; it is
  not a clinician or emergency dispatch service.
- Store private-support requests in a local outbox.

### Ground-server demo

- Model live, delayed, and blackout communications links.
- Store packets and transition them through sent, delivered, and acknowledged
  states based on recorded timestamps and configured link delay.
- Provide role-keyed crew, ground, and device endpoints; an EventSource stream;
  observation/check-in/encounter sync; device sample ingest; and audit-chain
  verification.
- Apply demo data-quality rules server-side. The backend does not diagnose or
  assign clinical meaning.

## Architecture and data flow

```text
frontend/  -> browser-only dashboard, check-ins, reports, voice and datasets
backend/   -> standalone Fastify API -> SQLite
```

The frontend is a Next.js App Router application. Its displayed live vitals
are generated in the browser, and daily check-ins, theme, support outbox, and
dataset selections use browser storage. Downloaded reports are JSON files.
The current “Send to Earth” interaction confirms a local queue action; it does
not call the backend.

The backend is independently runnable. It accepts API requests from demo
clients, stores records in SQLite, and broadcasts relevant events to stream
clients. Delays are based on stored timestamps, so packet state can advance
after a restart. See [backend/README.md](./backend/README.md) for request
examples and detailed behavior.

## Technology

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4,
  Base UI, Lucide icons, Vosk browser speech recognition, Kokoro speech
  synthesis, and WebLLM packages.
- **Backend:** Node.js 24, Fastify 5, TypeScript, SQLite via `better-sqlite3`,
  Zod validation, and Vitest.
- **Storage:** browser `localStorage` / Cache API for frontend-local data;
  SQLite for backend records.

## Requirements

- Node.js 24 (backend tested with 24.19.0) and npm 11 for the backend.
- pnpm 12.3.4 for the frontend (specified by `frontend/package.json`).
- A modern browser for the frontend. Microphone access and browser speech
  features require browser permission/support; the offline speech model may
  need to be downloaded or cached before first use.

## Run locally

Use separate terminals from the repository root.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Production commands:

```bash
pnpm build
pnpm start
```

### Backend

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://127.0.0.1:4000` by default. Useful commands:

```bash
npm test
npm run build
npm start
npm run fake-device
```

The fake device script expects the backend to be running. Configure its
`DEVICE_ID` and `CREW_ID` environment variables as described in
[backend/README.md](./backend/README.md).

To demonstrate a compressed one-minute one-way Mars delay in PowerShell:

```powershell
$env:DELAY_SCALE = "0.05"
npm run dev
```

The default scenario delay is 1200 seconds one way; `DELAY_SCALE=0.05` makes
the effective demo delay 60 seconds. Reset the variable by closing that
terminal or running `Remove-Item Env:DELAY_SCALE`.

## Backend configuration

The backend reads these environment variables at startup:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port. |
| `HOST` | `127.0.0.1` | Bind address. |
| `DB_PATH` | `./data/crewsignal.db` | SQLite database path; tests can use an in-memory database. |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed browser origins. |
| `CREW_KEY` | `crew-demo-key` | Demo bearer key for crew operations. |
| `GROUND_KEY` | `ground-demo-key` | Demo bearer key for ground operations. |
| `DEVICE_KEY` | `device-demo-key` | Demo bearer key for device ingest. |
| `DELAY_SCALE` | `1` | Positive multiplier applied to the scenario delay. |

All keys must be at least eight characters. These shared demo keys are not
identity management and must be replaced for any non-demo deployment.

## Backend API overview

Role-protected endpoints use `Authorization: Bearer <key>` unless noted.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health and link-delay status; no authorization required. |
| `GET`, `PUT /v1/link` | Read or set link state and environment. |
| `POST /v1/packets` | Submit a crew packet; blackout rejects it without storing it. |
| `GET /v1/packets`, `GET /v1/packets/:id` | List or inspect a crew member's packets. |
| `GET /v1/surgeon/inbox` | Ground inbox of delivered/acknowledged packets. |
| `POST /v1/surgeon/packets/:id/ack` | Ground acknowledgement of a delivered packet. |
| `POST`, `GET /v1/sync/:collection` | Push or pull observations, check-ins, and encounters. |
| `POST /v1/ingest/sample` | Ingest a device sample (device role; rate limited). |
| `GET /v1/stream` | Server-Sent Events stream for link, packet, and sample events. |
| `GET /v1/audit/verify` | Verify the audit hash chain. |

See [backend/README.md](./backend/README.md) for schemas, authentication
details, sample requests, link behavior, and audit verification examples.

## Data, privacy, and limitations

- The frontend stores daily check-ins and support requests in the current
  browser. Data is not shared across browsers or devices and can be removed by
  clearing site storage.
- The frontend's report download is local. The UI's report queue confirmation
  is simulated, and the current frontend does not send its reports or check-ins
  to the backend.
- Backend data is stored in SQLite at `DB_PATH`. Use non-demo secrets and
  protect the database file in any environment beyond local demonstration.
- The backend uses plain HTTP in the documented local setup, shared bearer
  secrets, and simple role checks. It is not designed or certified for
  HIPAA/GDPR compliance or secure medical-data transport.
- Quality gates and clinical reference ranges are demonstration logic, not
  clinical decision support. A good-quality reading does not mean a person is
  healthy; a poor-quality reading is not a diagnosis.
- Vitals are simulated, and radiation readings are static sample values.
  Nothing in this project should replace validated medical equipment, trained
  clinical judgment, or established emergency procedures.

## Tests and builds

Backend tests use Vitest with a fake clock and do not require real delay sleeps:

```bash
cd backend
npm test
npm run build
```

Frontend scripts currently provide development, production build, and
production start; no frontend test script is defined in its package manifest.

## Repository layout

```text
backend/
  src/                 Fastify server, routes, SQLite, sync, audit, quality rules
  scripts/             Fake telemetry device
  test/                Backend unit and integration tests
frontend/
  app/                 Next.js application entry and global layout/styles
  components/health/   Crew UI, dashboard, reports, forms, charts, datasets
  components/voice/    Voice service worker
  lib/voice/            Emergency dialogue, speech, model, and safety helpers
  lib/datasets/         Preset telemetry and import/export parsing
  scripts/             Dataset preparation utility
```
