---
name: FLOW MVP Visual Identity
type: ux-design-spine
status: final
updated: 2026-08-19
---

# FLOW Visual Identity & Tokens (DESIGN.md)

## 1. UX Principle & Vibe
**"Trust through Transparency."**
The UI must look distinctively premium for the hackathon demo. It shifts the paradigm from "Fastest Route" (utilitarian map apps) to "Most Reliable Route" (predictive intelligence). The interface relies on deep contrasts, semantic colors for risk/confidence, and strict typographic hierarchy for glanceability.

## 2. Color System (Dark Mode First)
- **Background (App):** Deep Slate/Void (`#0B0F19`)
- **Background (Cards/Glass):** Frosted Glass (`rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(12px)`). Used *only* where it improves the interface (e.g., bottom sheets over a map).
- **Text (Primary):** Pure White (`#FFFFFF`)
- **Text (Secondary):** Cool Gray (`#9CA3AF`)

### Semantic / Confidence Colors
- **Healthy / High Confidence (85-100%):** Electric Blue (`#3B82F6`)
- **Warning / At Risk (50-84%):** Amber/Vibrant Orange (`#F59E0B`)
- **Critical / Failed (<50%):** Rose Red (`#EF4444`)
- **Success / Recovered:** Emerald Green (`#10B981`)

## 3. Typography
**Primary Font:** `Inter` or `Outfit`.
- **Display/Headings:** Bold, highly readable. (e.g., Confidence Scores must be explicitly numeric, e.g., `text-6xl font-black`, not just an icon).
- **Body:** Regular, highly legible for explanations. Do not sacrifice readability for visual effects.

## 4. Key Visual Components
- **The Confidence Ring:** An animated SVG progress ring. It *enhances* the information but must never replace the readable numeric value.
- **The Explainability Payload Component:** A tightly structured data presentation component that prioritizes clarity over generic "AI chatbot" aesthetics.
- **Glassmorphism Bottom Sheet:** For mobile-first recovery interactions. The map remains visible but darkened behind it.
