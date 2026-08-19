---
name: FLOW MVP Commuter Experience
type: ux-experience-spine
status: final
updated: 2026-08-19
---

# FLOW Interaction & Experience (EXPERIENCE.md)

## 1. Information Hierarchy & Paradigm
The UI explicitly re-trains the user:
- Traditional: Sorts by `Time` or `Price`.
- FLOW: Sorts by `Connection Confidence`.

## 2. P0 Screen Flow & States
The demo must make transitions between these states visually obvious.

### Screen 1: Home / Journey Planning (PLANNED State)
- **Interaction:** User inputs origin and destination.

### Screen 2: Route Comparison (PLANNED State)
- **Hierarchy:** List of routes sorted by Confidence. (96% Confidence displayed).
- **Interaction:** User selects route.

### Screen 3: Active Journey (ACTIVE State)
- **Visuals:** Live map view. Persistently visible "96% Confidence" status.

### Screen 4: Connection-at-Risk Proactive Alert (AT_RISK State)
*(Triggered by +12 min delay injection)*
- **Visuals:** Heavy glassmorphic bottom sheet over dimmed map.
- **Strict Information Hierarchy:**
  1. **Clear Risk State:** `⚠ Connection at Risk`
  2. **Large Numeric Confidence:** `58% Connection Confidence`
  3. **What Changed:** "Bus 21 is predicted to arrive 12 minutes late."
  4. **Why It Matters:** "Your 9-minute transfer buffer is no longer sufficient."
  5. **Confidence Transition:** "96% → 58%"

### Screen 5: Fallback Comparison (RECOVERY_OFFERED State)
*(Contained within the Proactive Alert sheet)*
- **Hierarchy:**
  6. **Recommended Recovery:** "Route B — 93% confidence"
  7. **Decision Metrics:** Comparison of Confidence, Travel time, Cost, Eco impact vs failing route.
  8. **Primary Action:** Large `Switch Route` button.
  9. **Secondary Action:** `View other options` text link.

### Screen 6: Recovery Confirmation (RECOVERED State)
- **Interaction:** User clicks "Switch Route".
- **Visuals:** Screen flashes Emerald Green. Journey recovers. New route plotted.

### Screen 7: Post-Journey Impact Summary (COMPLETED State)
- **Visuals:** End-of-trip summary.
- **Message:** Shows Baseline vs FLOW outcome. Demonstrates the exact Prediction Lead Time saved.
