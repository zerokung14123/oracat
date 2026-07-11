# Product Specification: ตีนแมวfoto

`PRODUCT.md` documents the product strategy, target audience, core features, and brand personality of **ตีนแมวfoto** to guide AI agent design decisions.

---

## 1. Product Identification
*   **Product Name:** ตีนแมวfoto (Teenmao Foto)
*   **Product Type:** Split-service web application consisting of:
    1.  **Portfolio Client Showcase (`portfolio`):** A client-facing showcase site to explore the photographer's portfolio categories, submit new booking requests via Google authentication, and track post-production progression.
    2.  **Manager Dashboard (`manager`):** A photographer-facing dashboard to manage photo uploads, approve/reject bookings, edit job parameters, track accounting, run tax planning, and generate canvas booking documents.
    3.  **Unified Backend (`backend`):** A secure REST API serving portfolio data, managing SQLite persistence, and verifying photographer auth tokens.

---

## 2. Target Audience
*   **Primary Users (Photographer):** Independent sole-proprietor photographers in Thailand who need an elegant, unified, self-hosted system to manage client interactions, schedule queues, automate administrative tasks, and forecast income tax.
*   **Secondary Users (Clients):** Couples, graduates, event planners, and individuals booking high-end photography who value professional presentation, transparent job progression tracking, and clean digital delivery.

---

## 3. Brand Personality & Tone
*   **Warm & Premium:** High-end, premium presentation with a touch of cat-inspired warmth and charm ("ตีนแมว" / cat paws). It avoids sterile, generic corporate designs, opting instead for a cozy luxury aesthetic.
*   **Trustworthy & Professional:** Clear organization, detailed tables, interactive charts, and exact, downloadable official booking slips to project security and transparency.
*   **Language:** Native Thai for local business interaction, seamlessly combined with English interface labels for technical terms.

---

## 4. Key Workflows & Features
*   **Queue Management:** Searchable and filterable photographer queue tracking jobs by status (`briefed` -> `shooting` -> `editing` -> `completed`) and attaching delivery download URLs.
*   **Real-time Status Tracking:** Clients input a unique 6-character code (e.g., `ORAWED`) directly on the portfolio to inspect their shoot progression.
*   **Automated Document Builder:** Uses HTML5 Canvas to compose and export a print-ready, high-resolution JPG booking confirmation slip detailing event date, location, pricing, deposit, terms, and the client's payment slip.
*   **Sole-Proprietor Tax Planner:** Calculates progressive Thai personal income tax brackets based on active annual bookings, factoring in standard sole-proprietor deductions (40(8) sole proprietorship).
