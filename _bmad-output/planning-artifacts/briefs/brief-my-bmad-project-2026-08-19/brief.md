---
title: "FLOW — Predictive Transit Recovery"
status: draft
created: 2026-08-19
updated: 2026-08-19
---

# Product Brief: FLOW — Predictive Transit Recovery

## Executive Summary

FLOW is a predictive multimodal transit recovery system designed to minimize the probability of journey failure.

Instead of simply calculating the theoretically fastest route, FLOW continuously evaluates whether a commuter is likely to successfully complete their planned journey. It monitors current transit delays, transfer buffers, route reliability, and historical delay variance to calculate a transparent **Connection Confidence Score**.

When the confidence of an upcoming connection falls below a configurable safety threshold, FLOW proactively identifies the risk before the commuter reaches the failing transfer and recommends alternative routes ranked by reliability, travel time, cost, and environmental impact.

The hackathon MVP will demonstrate this using static transit network data and simulated real-time disruptions.

The long-term vision is to extend this individual journey recovery engine into a **Dynamic Demand Balancer** capable of distributing commuters across alternative routes during large-scale disruptions to prevent secondary congestion.

---

# The Problem

Multimodal commuters are vulnerable to cascading failures.

A small delay in one bus or train can cause a missed transfer, forcing the commuter to improvise a new route after the failure has already occurred.

This creates:

- missed connections
- unpredictable arrival times
- transfer anxiety
- reactive overcrowding on alternative routes
- increased dependence on private vehicles

The core problem is therefore not simply:

> "Is my bus delayed?"

It is:

> **"Will this delay cause my entire journey to fail?"**

---

# The Solution

FLOW introduces **Confidence Routing**.

For every critical transfer, the system estimates the probability that the commuter will successfully make the connection.

The MVP uses a deterministic reliability model based on:

- predicted arrival time
- transfer buffer
- minimum transfer time
- historical delay variance
- P95 historical delay

The system calculates:

**Connection Buffer**

= Predicted arrival at transfer − Required transfer time

**Risk Margin**

= Connection Buffer − Historical P95 delay

The resulting Connection Confidence is normalized into a 0–100% probability-like score.

The safety threshold is configurable and initially set to 85% for the MVP.

When confidence drops below the threshold, FLOW proactively triggers journey recovery.

---

# Journey Recovery

FLOW generates alternative routes and scores them using normalized criteria:

**Fallback Score**

= wR × Reliability
+ wT × Time Score
+ wC × Cost Score
+ wE × Eco Score

where:

**wR + wT + wC + wE = 1**

Users can customize these priorities.

For example:

### Reliability-first

Reliability: 60%  
Time: 20%  
Cost: 10%  
Eco: 10%

### Speed-first

Reliability: 30%  
Time: 50%  
Cost: 10%  
Eco: 10%

This makes FLOW's recommendation transparent rather than presenting an unexplained "best route."

---

# What Makes FLOW Different

Traditional navigation asks:

> **"What route is fastest?"**

FLOW asks:

> **"What route is most likely to succeed?"**

This shifts routing from static optimization to **predictive journey recovery**.

The core innovation is the Connection Confidence Score combined with proactive fallback generation.

---

# Target Users

### Primary

Daily multimodal commuters who prioritize predictable arrival over theoretical minimum travel time.

### Secondary

Transit operators and mobility providers who need better visibility into disruption impact.

### Long-Term Customers

Transit authorities, MaaS platforms, and municipal transportation systems.

---

# Hackathon MVP

## P0 — Must Work

1. Multimodal journey planning
2. Connection Confidence calculation
3. Simulated real-time transit delays
4. Predictive connection-failure detection
5. Automatic fallback generation
6. Transparent weighted fallback ranking
7. Proactive commuter notification
8. Before/after journey visualization

## P1 — High-Impact Extension

1. Simulate 1,000–5,000 affected commuters
2. Detect secondary bottleneck formation
3. Distribute commuters across alternative routes
4. Show city/operator impact dashboard
5. Compare "without FLOW" vs "with FLOW"

## P2 — Future

- Real-time city-wide deployment
- Crowdsourced anomaly detection
- Dynamic incentives
- Transit operator integrations
- Fleet optimization
- City-scale digital twin
- Automated demand orchestration

---

# Demonstration Scenario

The primary hackathon demonstration will follow one journey:

**Origin → Destination**

↓

FLOW calculates:

**Connection Confidence: 94%**

↓

A simulated transit disruption introduces a **+12 minute delay**.

↓

FLOW recalculates:

**Connection Confidence: 58%**

↓

FLOW predicts that the commuter is likely to miss the upcoming connection.

↓

FLOW proactively generates alternatives:

**Route A — Reliability First**

92% confidence

**Route B — Fastest**

84% confidence

**Route C — Cheapest**

79% confidence

↓

The commuter selects or accepts the recommended fallback.

For the P1 demonstration, thousands of simulated commuters experience the same disruption. FLOW distributes them across alternative routes instead of directing everyone toward a single fallback, demonstrating the potential reduction of secondary congestion.

---

# Success Metrics

### Connection Rescue Rate

Percentage of threatened journeys successfully recovered using FLOW's recommended fallback.

### Prediction Lead Time

Time between FLOW identifying a likely connection failure and the actual missed connection.

### Reliability Improvement

Difference in successful-arrival probability between the original route and FLOW's fallback.

### Recovery Latency

Time required to detect a confidence drop and generate a viable fallback.

### Secondary Congestion Reduction

Reduction in simulated bottleneck load when FLOW distributes affected commuters across alternatives.

---

# Vision

FLOW begins as an individual journey-recovery engine.

Over time, the same intelligence can operate at network scale.

When thousands of commuters experience the same disruption, FLOW can predict how fallback choices will affect network capacity and distribute demand accordingly.

The long-term evolution is:

**Predict → Recover → Redistribute**

From helping one commuter avoid a missed connection to helping entire cities gracefully recover from transportation disruptions.
