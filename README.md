# Photographer Portfolio & Management System (ตีนแมวfoto)

A high-aesthetic, fully decoupled full-stack photographer portfolio and business management system.

## Project Structure

```txt
oracat/
├── backend/                 # Node.js, Express, SQLite REST API
│   ├── src/
│   │   ├── config/db.js     # DB initialization, SQL migrations, seeding
│   │   ├── controllers/     # Business logic controllers
│   │   ├── middleware/      # JWT route protection middleware
│   │   ├── routes/          # REST endpoints router map
│   │   └── app.js           # Server runner (CORS, body-parser limits)
│   └── database.sqlite      # Active SQL database file
│
├── portfolio/               # Elegant Client Showcase Site (Vite, React, Tailwind)
│   ├── src/
│   │   ├── App.jsx          # Photo grid, track search, Google login triggers
│   │   └── index.css        # Glassmorphism and scrollbar aesthetics
│   └── index.html
│
└── manager/                 # Private Control Panel (Vite, React, Tailwind)
    ├── src/
    │   ├── App.jsx          # Login guard, gallery edit, booking approvals, status tracks
    │   └── index.css        # Dashboard styling overrides
    └── index.html
```

---

## Getting Started (How to Run Locally)

This app runs fully locally. We have set up a workspace manager to run all services concurrently.

### Option A: One-Click Execution (Recommended)

Simply double-click the **`RUN_DEV.cmd`** file in the root folder. It will:
1. Check if Node.js is installed.
2. Automatically check and install missing dependencies for the root, backend, portfolio, and manager projects if they are not already installed.
3. Start all development servers (Backend, Client Portfolio Showcase, and Manager Dashboard) concurrently.

### Option B: CLI Commands

If you prefer to run it manually from a terminal:

#### 1. Installation

From the root directory, install all workspace and sub-service dependencies with a single command:

```bash
npm run install-all
```

#### 2. Run in Development Mode

To start the Backend, Photographer Manager Dashboard, and Client Portfolio Showcase concurrently:

```bash
npm run dev
```

This starts:
- **Backend API**: `http://localhost:5000` (SQLite automatically seeds on first start)
- **Client Portfolio Showcase**: `http://localhost:3000`
- **Photographer Manager Dashboard**: `http://localhost:3001`

### 3. Photographer Dashboard Authentication
Sign in using default username/password:
- **Username**: `admin`
- **Password**: `admin123`

---

## Key Features

1. **Decoupled Architecture**: Front-end apps communicate with the back-end using purely JSON-based REST APIs.
2. **Dynamic Configurations**: Title, subtitles, layout preferences, and social contacts are dynamically queried from settings databases.
3. **Automatic Booking Progression**: Approving booking inquiries generates a unique 6-digit code. Searching this code displays dynamic progress bar states: Brief Received ➡️ Shooting ➡️ Editing ➡️ Deliverable Link.
4. **Sole-Proprietor Tax Planner**: Calculates progressive Thai personal income tax brackets based on active annual bookings, factoring in standard sole-proprietor deductions (40(8) sole proprietorship).
