---
title: FLOW
created: 2026-08-19
updated: 2026-08-19
status: final
---

# PRD: FLOW — Predictive Transit Recovery

## 0. Document Purpose
This document defines the requirements for the FLOW MVP, built for a 3-person hackathon team using BMad and Antigravity. It establishes the functional constraints to build a predictive multimodal transit recovery system.

## 1. Vision & Positioning

Traditional navigation asks: **"What route is fastest?"**
FLOW asks: **"What route is most likely to succeed?"**

FLOW is a predictive multimodal transit recovery system designed to minimize the probability of journey failure and help commuters arrive more predictably even when the transit network is disrupted. It operates on a core progression:
**PREDICT → RECOVER → REDISTRIBUTE**

### 1.1 FLOW Decision Principle
FLOW should act before failure, explain why failure is likely, and provide the commuter with a meaningful recovery choice while there is still time to act.

### 1.2 The Systemic Problem: Cascading Failures
Currently, transit disruptions trigger mass rerouting where conventional engines send everyone to the fastest available fallback. 
**The Cascade:** Disruption → mass rerouting → everyone chooses fastest fallback → secondary route overload → secondary congestion → further failures.

FLOW's intelligence breaks this cycle:
**The FLOW Model:** Disruption → identify affected journeys → generate alternatives → consider route capacity → distribute demand → reduce secondary bottlenecks. *(Note: Distributing demand is a P1 simulation feature for the hackathon, not required for a real city-wide MVP).*

## 2. Target User

### 2.1 Jobs To Be Done
- Ensure I arrive at my destination predictably and on time.
- Avoid the anxiety of missing tight multimodal connections.
- Receive actionable, transparent alternatives *before* a failure cascades into a stranded scenario.

### 2.2 Key User Journeys

**UJ-1 (P0). Aarav avoids a failing transfer via proactive routing.**
- **Persona + context:** Aarav plans a multimodal journey across Chennai.
- **Path:** FLOW shows Connection Confidence. A transit delay occurs on his first leg.
- **Climax:** Confidence falls. FLOW predicts connection failure. It issues a proactive warning.
- **Resolution:** A fallback is generated. Aarav switches *before* the failure happens. The journey is recovered.

**UJ-2 (P1). Network disruption simulation.**
- **Persona + context:** A transit operator/judge viewing the system dashboard during a major failure.
- **Path:** A major disruption affects 1,000+ synthetic commuters. The fastest-route baseline causes a secondary bottleneck.
- **Climax:** FLOW distributes commuters across alternatives based on individual preferences and route capacity.
- **Resolution:** The dashboard clearly compares the baseline vs FLOW, proving the reduction in secondary congestion.

## 3. Glossary & Core Algorithms

- **Connection Buffer:** Predicted Arrival Time − Required Transfer Time.
- **Risk Margin:** Connection Buffer − Historical P95 Delay.
- **Connection Confidence Score:** A normalized 0–100% score representing the likelihood of successfully making a transfer. *Note: This is a deterministic, probability-like heuristic for the MVP, NOT a statistically calibrated probability. The exact normalization function is configurable for the Architecture phase.*
- **Fallback Score:** A weighted ranking of alternative routes. All component scores are normalized before weighting.
  `Fallback Score = (wR × Reliability Score) + (wT × Time Score) + (wC × Cost Score) + (wE × Eco Score)`
  *(Constraint: wR + wT + wC + wE = 1)*. Because user preference weights are configurable, two users experiencing the exact same disruption at the exact same location can receive different fallback recommendations.
- **Prediction Lead Time:** The time between FLOW identifying a likely connection failure and the expected/actual connection failure.

## 4. Success Metrics & Baseline Comparison

All results must be clearly labeled as **simulated results**. Do NOT fabricate real-world performance claims. The simulation must compare FLOW against a conventional fastest-route baseline.

**North Star Metric: Successful Journey Rate**
The percentage of simulated journeys that reach their destination without an unexpected failed connection or unplanned major reroute.

**Supporting & Baseline Comparison Metrics:**
- **Prediction Lead Time:** Demonstrates FLOW acts *before* the connection is missed.
- **Journey Success Rate:** FLOW vs. Baseline.
- **Average Delay:** FLOW vs. Baseline.
- **Missed Connection Rate:** FLOW vs. Baseline.
- **Recovery Latency:** Time to detect confidence drop and generate a fallback (Target ≤ 3 seconds).
- **Secondary Bottleneck Load:** Reduction in overload on alternative routes (FLOW vs. Baseline).

## 5. Functional Requirements (Features)

### 5.1 Confidence Routing Engine (P0)
**FR-1: Connection Confidence Calculation**
The system must deterministically calculate Connection Confidence from the Risk Margin and normalize it to a 0–100% score. The normalization function must be deterministic, explainable, configurable, and defined during the Architecture phase. The score must be presented as a probability-like heuristic and not as a statistically calibrated probability.

**FR-2: Journey State Management**
The system must monitor real-time updates and dynamically recalculate buffers. 

**FR-3: Predictive Connection Failure & Missed Off-Ramp Recovery**
If the confidence drops below the threshold, the system flags the route. If a user misses the recommended off-ramp, the system recalculates from the next viable node based on continued movement.

### 5.2 Proactive Fallback UI & Explainability (P0)
**FR-4: Proactive Commuter Notification**
Alert the user before the failure occurs (Prediction Lead Time).

**FR-5: Transparent Fallback Explanations**
Every important FLOW decision must expose WHAT changed, WHY it changed, HOW it affects the journey, and WHAT FLOW recommends. The user should never receive an unexplained AI recommendation.
*Example:* Bus predicted +12 min late → transfer buffer falls from 9 min to -3 min → Connection Confidence falls from 96% to 58% → original journey is at risk → Route B is recommended at 93% confidence.

**FR-6: Weighted Fallback Ranking**
The system must rank alternatives using the configurable Fallback Score.

### 5.3 Simulation Engine (P0/P1)
**FR-7: Simulated Real-Time Disruption (P0)**
The system must allow manual injection of delays into a static network to trigger recovery logic for a single journey.

**FR-8: Baseline Comparison (P0) & Network Simulation (P1)**
**P0 (Single User):** Compare a single user's FLOW journey against the conventional fastest-route baseline. Measure journey success, delay, missed connection, and recovery outcomes.
**P1 (Network Scale):** Simulate 1,000+ synthetic commuters. Apply route capacity constraints. Compare everyone taking the fastest fallback against FLOW's demand-aware distribution. Measure secondary bottleneck load and network-level outcomes.

## 6. Non-Functional Requirements (Cross-Cutting)
- **Performance:** Recovery latency target ≤ 3 seconds under the MVP simulation workload. Do not over-engineer production infrastructure.
- **Explainability:** Every risk/recommendation must be programmatically explainable.
- **Safety:** Fallback routes must not recommend unsafe transfers or un-walkable highway off-ramps.
- **Reliability:** Graceful degradation if real-time data becomes unavailable (e.g., fallback to static schedules).

## 7. MVP Scope & Hackathon Execution

**Hackathon Constraint:**
Designed for a 3-person team using 3 Antigravity development environments with BMAD.
The architecture should allow parallel ownership:
- **Developer 1:** Core routing, Connection Confidence, journey state, fallback engine, APIs.
- **Developer 2:** Commuter frontend, map, confidence UI, fallback comparison, and recovery experience.
- **Developer 3:** Simulation engine, synthetic commuters, demand balancing, and operator dashboard.

**P0 (Must Work):**
Multimodal journey planning, Connection Confidence calculation, Journey state management, Simulated real-time disruption, Predictive connection failure, Automatic fallback generation, Weighted fallback ranking, Transparent explanation, Proactive recovery UI, Recalculation after missed off-ramp, Baseline comparison (single-journey comparison).

**P1 (Should Work):**
1,000+ synthetic commuter network simulation, Demand-aware fallback distribution, Route capacity constraints, Operator/city dashboard, Before-vs-after visualization.

**P2 (Future / Out of Scope):**
Real city-wide deployment, Crowdsourced anomaly detection, Dynamic incentives, Transit operator integrations, Fleet optimization, City-scale digital twin, Automated demand orchestration.
