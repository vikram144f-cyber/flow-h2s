# FLOW — Transit Network Intelligence

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black)
![React](https://img.shields.io/badge/React-19.2.8-blue)

FLOW is a deterministic transit-network simulation that explores how a routing system can preserve successful journeys when many commuters converge on the same route. It compares conventional fastest-route assignment with a capacity-aware, preference-weighted distribution strategy.

The project is intentionally a local simulation. It does not currently consume live GTFS or GTFS-RT feeds, and its transit data is synthetic fixture data in `static-data/mock-gtfs.json`.

## What it demonstrates

- A connection-confidence model based on transfer buffers and historical delay margins.
- A journey state machine covering active, at-risk, recovery, and completed states.
- Explainable fallback recommendations when a simulated delay threatens a transfer.
- Deterministic commuter preference generation from a seeded PRNG.
- Capacity-aware route assignment that exposes secondary bottlenecks.
- A generated network view with bus, metro, and walking connections.

## Built with

- Next.js App Router and React
- Tailwind CSS v4 and Lucide React
- TypeScript
- Prisma ORM with MySQL
- Node's built-in test runner through `tsx`

## Getting started

### Prerequisites

- Node.js 20+
- npm
- MySQL 8+

### Install and configure

```bash
git clone https://github.com/vikram144f-cyber/flow-h2s.git
cd flow-h2s
npm ci
```

Copy `.env.example` to `.env` and update `DATABASE_URL` with a MySQL database that the application can access.

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the commuter demo. The operator simulation is available at [http://localhost:3000/operator](http://localhost:3000/operator).

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The test suite uses deterministic fixture data and does not download external models or datasets. Database-backed tests run when `DATABASE_URL` is configured; otherwise those two integration suites are reported as skipped. To run them, initialize MySQL with `npm run db:push` and `npm run db:seed`.

## Architecture

```text
app/
  page.tsx                         commuter recovery demo
  (operator)/operator/             network simulation dashboard
  api/                             journey and simulation route handlers
lib/
  modules/journey/                 state transitions, delays, explanations
  modules/routing/                 confidence and fallback scoring
  modules/network/                 synthetic graph generation and routing
  modules/simulation/              seeded commuter and capacity simulation
prisma/
  schema.prisma                    MySQL persistence model
static-data/mock-gtfs.json         deterministic demo fixture
```

## Scope and next steps

FLOW is a focused engineering prototype rather than a production transit platform. A production version would need live feed ingestion, time-dependent routing, stronger persistence boundaries, observability, and user-level authorization. Those concerns are deliberately outside this deterministic demo.
