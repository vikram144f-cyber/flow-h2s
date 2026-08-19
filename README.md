# 🌊 FLOW: The Graceful Degradation Router

*A "never stranded" guarantee for multimodal commuters.*

---

## 🚀 Overview
FLOW is a predictive multimodal coordination system designed to eliminate "transfer anxiety." Instead of offering the absolute fastest route based on theoretical P50 estimates, FLOW acts as an intelligent transit layer. It continuously calculates a **Connection Confidence Score** for your journey based on live GTFS-RT delays. 

If the score drops below a safe threshold, the system proactively pushes a transparently ranked fallback route before you reach the failing node, ensuring you are never stranded.

## ✨ Key Features
- **Connection Confidence Score:** A continuous probability metric (separating "theoretical speed" from "likely to succeed") that alerts you when a transfer buffer shrinks.
- **Proactive "Rescue" Pattern:** The system interrupts the UI *before* failure, providing a fully actionable alternative. 
- **Transparent Fallback Ranking:** When a delay occurs, fallbacks are evaluated and ranked based on **Reliability + Arrival Time + Cost + Eco Impact**.
- **Cascading Failure Protection:** If the accepted fallback *also* fails, the continuous monitoring dynamically kicks in again.
- **Premium Glassmorphic UI:** Deep Dark Mode, dynamic semantic glowing gauges (Emerald/Amber/Red), and smooth modal sheet transitions.

## 🛠️ Built With
- **Framework:** Next.js (App Router)
- **Styling:** Custom Tailwind CSS v4 & Glassmorphic UI
- **Database:** SQLite with Prisma ORM
- **Logic:** Simulated GTFS-RT intelligence layer

## 🏃‍♂️ Getting Started

To run the FLOW MVP simulation locally:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Explore the Demo:**
   Open [http://localhost:3000](http://localhost:3000) with your browser. The simulation will showcase the Confidence Gauge, Timeline, and cascading simulated transit delays triggering the Rescue Pattern.

## 📂 Documentation

The initial product specs, architecture spines, and design philosophies created during brainstorming can be found in the `_bmad-output/` directory:
- [PRD & Brief](_bmad-output/planning-artifacts/prds/prd-nexus-hack-2026-08-19/prd.md)
- [UX Flow Design](_bmad-output/planning-artifacts/ux-designs/ux-nexus-hack-2026-08-19/DESIGN.md)
- [Architecture](_bmad-output/planning-artifacts/architecture/architecture-nexus-hack-2026-08-19/ARCHITECTURE-SPINE.md)

---
*Built for the NEXUS HACKATHON (August 2026)*
