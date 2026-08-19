# 🌊 FLOW: The Graceful Degradation Router

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black)
![React](https://img.shields.io/badge/React-19.2.8-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC)

*A "never stranded" guarantee for multimodal commuters.*

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Built With](#-built-with)
- [Getting Started](#-getting-started)
- [Project Architecture](#-project-architecture)
- [Documentation](#-documentation)

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

- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **Styling:** Custom [Tailwind CSS v4](https://tailwindcss.com/) & Glassmorphic UI
- **Database:** SQLite with [Prisma ORM](https://www.prisma.io/) & [libSQL](https://docs.turso.tech/libsql)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Data Fetching:** [SWR](https://swr.vercel.app/)

## 🏃‍♂️ Getting Started

To run the FLOW MVP simulation locally, follow these steps:

### Prerequisites

- Node.js (v20+ recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vikram144f-cyber/flow-h2s.git
   cd flow-h2s
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   Ensure you have a `.env` file with any required environment variables (if applicable for Prisma). Generate Prisma client:
   ```bash
   npx prisma generate
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Explore the Demo:**
   Open [http://localhost:3000](http://localhost:3000) with your browser. The simulation will showcase the Confidence Gauge, Timeline, and cascading simulated transit delays triggering the Rescue Pattern.

## 🏗️ Project Architecture

FLOW is structured with a modern Next.js App Router architecture:
- `app/` - Core routing, layouts, and page views.
- `components/` - Reusable React components (UI elements, layout wrappers).
- `lib/` - Utility functions, configurations, and shared logic.
- `prisma/` - Database schema and seed scripts.
- `public/` - Static assets.

## 📂 Documentation

The initial product specs, architecture spines, and design philosophies created during brainstorming can be found in the `_bmad-output/` directory:
- [PRD & Brief](_bmad-output/planning-artifacts/prds/prd-nexus-hack-2026-08-19/prd.md)
- [UX Flow Design](_bmad-output/planning-artifacts/ux-designs/ux-nexus-hack-2026-08-19/DESIGN.md)
- [Architecture](_bmad-output/planning-artifacts/architecture/architecture-nexus-hack-2026-08-19/ARCHITECTURE-SPINE.md)

---
*Built for the NEXUS HACKATHON (August 2026)*
