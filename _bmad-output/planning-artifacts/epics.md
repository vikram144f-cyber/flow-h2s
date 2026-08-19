---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
inputDocuments: [
  "_bmad-output/planning-artifacts/prds/prd-my-bmad-project-2026-08-19/prd.md",
  "_bmad-output/planning-artifacts/architecture/architecture-my-bmad-project-2026-08-19/ARCHITECTURE-SPINE.md"
]
---

# FLOW MVP - Unified Solo Developer Backlog

## Implementation Strategy & Overview
This backlog is optimized for a single developer executing a hackathon build. It completely discards team-based overhead and focuses strictly on sequential, independently testable end-to-end features.

1. **P0 Critical Path:** Stories 1.1 through 1.7 MUST be completed in order. This achieves the core hackathon demo (PLAN → DELAY → ALERT → RECOVER).
2. **Highest-Risk Technical Task:** Story 1.2 (Deterministic Connection Math) and Story 1.4 (Journey State Machine). The entire product hinges on these two executing reliably before the UI is even built.
3. **P1 Network Simulation:** Epic 2 should only be started AFTER Epic 1 is fully functional and demo-able.

---

## Epic 1: P0 Critical Path - The Single User Journey
**Goal:** Implement the primary vertical slice: PLAN JOURNEY → SHOW CONFIDENCE → SIMULATE DELAY → CONFIDENCE DROPS → PREDICT FAILURE → EXPLAIN WHY → GENERATE FALLBACK → ACCEPT FALLBACK → RECOVER JOURNEY → SHOW BASELINE COMPARISON.

### Story 1.1: Scaffold Next.js Monolith and Local Data (P0)
**Map to PRD:** N/A (Infrastructure Setup)
**Map to Arch:** Structural Seed, Stack (Next.js + SQLite)
**Dependencies:** None
**Acceptance Criteria:**
- **Given** a fresh repo clone,
- **When** running `npm run dev`,
- **Then** the Next.js app starts on localhost.
- **And** Prisma schemas for `Journey`, `Leg`, and `Transfer` are initialized via SQLite.
- **And** static mock GTFS routes needed for the primary demo are loaded into a `static-data/` folder.

### Story 1.2: Deterministic Connection Confidence Math (P0)
**Map to PRD:** FR-1 (Connection Confidence Calculation)
**Map to Arch:** Core Domain Models & Math (Linear Clamp Model)
**Dependencies:** 1.1
**Acceptance Criteria:**
- **Given** a `Predicted Arrival Time` and `Required Transfer Time`, calculate the `Connection Buffer`.
- **Given** a `Historical P95 Delay`, calculate the `Risk Margin`.
- **Given** the `Risk Margin`, return a deterministic 0-100% confidence score using the clamp: `MAX(0, MIN(100, 50 + (Risk Margin * 10)))`.
- **And** this logic exists as an isolated, unit-testable utility function.

### Story 1.3: Fallback Score Calculation (P0)
**Map to PRD:** FR-6 (Weighted Fallback Ranking)
**Map to Arch:** AD-4 (Fallback Score Normalization)
**Dependencies:** 1.2
**Acceptance Criteria:**
- **Given** multiple fallback routes,
- **When** calculating scores,
- **Then** normalize Reliability, Time, Cost, and Eco scores to 0-100 scales.
- **And** apply configurable user weights (where wR + wT + wC + wE = 1) to output a final Fallback Score.

### Story 1.4: Journey State Machine & Explainability Payload (P0)
**Map to PRD:** FR-2 (Journey State), FR-5 (Explainability)
**Map to Arch:** AD-3 (Explainability Contract), State Machine diagram
**Dependencies:** 1.2, 1.3
**Acceptance Criteria:**
- **Given** the state machine,
- **Then** implement these exact transitions:
  - A newly created journey starts as `PLANNED`.
  - When the journey begins, it transitions to `ACTIVE`.
  - When Connection Confidence drops below the configured threshold, it transitions to `AT_RISK`.
  - When a fallback is presented, it transitions to `RECOVERY_OFFERED`.
  - When the user accepts a fallback, it transitions to `RECOVERED`.
  - When the destination is reached, it transitions to `COMPLETED`.
  - Invalid state transitions must be rejected.
- **When** transitioning to `AT_RISK`, generate the exact structured JSON explainability payload:
  ```json
  {
    "whatChanged": "Bus 21 is predicted to arrive 12 minutes late.",
    "whyItMatters": "Your 9-minute transfer buffer is no longer sufficient.",
    "journeyImpact": "Connection Confidence dropped from 96% to 58%.",
    "recommendation": "Switch to Route B with 93% confidence."
  }
  ```
- **And** this explanation must be generated programmatically and usable directly by the frontend.

### Story 1.5: Delay Injection API (P0)
**Map to PRD:** FR-7 (Simulated Real-Time Disruption)
**Map to Arch:** AD-2 (Deterministic GTFS Simulation)
**Dependencies:** 1.4
**Acceptance Criteria:**
- **Given** the backend API,
- **When** calling `/api/inject-delay` with a Leg ID and delay amount,
- **Then** update the `Predicted Arrival Time` in the database.
- **And** automatically trigger a recalculation of the Journey's Connection Confidence.

### Story 1.6: Commuter Frontend - Proactive Alert & Recovery (P0)
**Map to PRD:** UJ-1, FR-4 (Proactive Notification)
**Map to Arch:** `app/(commuter)` UI
**Dependencies:** 1.4, 1.5
**Acceptance Criteria:**
- **Given** an `ACTIVE` journey on the frontend, render the route and live confidence score.
- **When** polling the backend sees the state change to `AT_RISK`, display an immediate alert modal.
- **Then** render the exact structured text from the explainability payload.
- **And** display ranked fallback options using the Fallback Score.
- **When** the user selects a fallback, update the active route on the map.

### Story 1.7: Baseline Fastest-Route Comparison (P0)
**Map to PRD:** FR-8 (Baseline Comparison P0), Success Metrics
**Map to Arch:** `modules/simulation`
**Dependencies:** 1.6
**Acceptance Criteria:**
- **Given** a recovered journey,
- **When** the journey completes,
- **Then** show a split-screen or summary modal comparing the FLOW outcome vs the conventional fastest-route baseline under the exact same simulated disruption.
- **And** prominently display the metric: `Prediction Lead Time = time between FLOW detecting a likely connection failure and the expected/actual connection failure.`

---

## Epic 2: P1 Network Disruption Simulation (Optional)
**Goal:** Simulate 1,000+ commuters hitting a disruption, comparing baseline fastest-route overload against FLOW's demand-aware distribution. Only begin this if P0 is completely functional.

### Story 2.1: Synthetic Commuter Load Generator (P1)
**Map to PRD:** FR-8 (Network Simulation)
**Map to Arch:** `modules/simulation` (AD-1 P1 Isolation)
**Dependencies:** 1.7
**Acceptance Criteria:**
- **Given** a script or API endpoint,
- **When** executed, generate 1,000 synthetic `ACTIVE` journeys passing through a specific transit node.
- **And** inject a massive disruption event at that exact node.

### Story 2.2: Demand-Aware Distribution Engine (P1)
**Map to PRD:** 1.2 The FLOW Model (Redistribute), FR-8
**Map to Arch:** `modules/simulation`
**Dependencies:** 2.1
**Acceptance Criteria:**
- **Given** the 1,000 disrupted journeys,
- **When** generating fallbacks, track the capacity of each alternative route.
- **Then** apply randomized user preference weights to generate distinct Fallback Scores for different users.
- **And** prevent any single fallback route from exceeding its capacity threshold to avoid secondary bottlenecks.

### Story 2.3: Operator Simulation Dashboard (P1)
**Map to PRD:** UJ-2, FR-8
**Map to Arch:** `app/(operator)`, Recharts
**Dependencies:** 2.2
**Acceptance Criteria:**
- **Given** the operator frontend route,
- **When** the simulation completes,
- **Then** render a visual chart (using Recharts) comparing the baseline (all commuters jam one route) vs FLOW (commuters distributed across network).
- **And** display the `Successful Journey Rate` and `Secondary Bottleneck Load` metrics.
