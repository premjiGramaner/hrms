# HRMS

A full-stack HR Management System with employee management, leave management,
performance appraisals, role-based access, and HR administration tooling.

## Tech Stack

**Client** (`client/`)
- React 18 + TypeScript
- Vite
- Redux Toolkit + React Redux
- React Router
- Tailwind CSS
- Axios

**Server** (`server/`)
- Node.js (ES modules) + Express
- PostgreSQL (`pg`)
- JWT authentication (`jsonwebtoken`, `cookie-parser`)
- Nodemailer (email notifications)
- node-cron (scheduled jobs)
- ExcelJS / PDFKit (report exports)

## Project Structure

```
hrms/
├─ client/                  # React + TypeScript frontend
│  └─ src/
│     ├─ api/                # Axios API clients
│     ├─ components/          # Shared UI components
│     ├─ pages/                # Feature pages (employees, leave, hradmin, roles)
│     ├─ store/                # Redux slices
│     └─ validations/          # Form validation schemas
└─ server/                  # Express + PostgreSQL backend
   ├─ database/
   │  └─ migrations/           # SQL migrations (see below)
   ├─ src/
   │  ├─ config/                # DB connection config
   │  ├─ controllers/            # Route handlers
   │  ├─ middleware/              # Auth, error handling
   │  ├─ models/                  # SQL queries per domain
   │  ├─ routes/                   # Express routers
   │  └─ services/                  # Business logic (notifications, audit, etc.)
   └─ run_migration.js          # Migration runner CLI
```

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ (running locally or reachable)

## Getting Started

### 1. Clone and install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment variables

Create `server/.env` with the following keys:

```
NODE_ENV=development
PORT=5001
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
REMEMBER_ME_DURATION=30d

DB_HOST=localhost
DB_PORT=5432
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=hrms

SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-app-password>
MAIL_FROM=<your-from-address>
```

The server prefers the discrete `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
fields for connecting to PostgreSQL. A `DATABASE_URL` connection string is
supported as a fallback if the discrete fields aren't set, but make sure any
special characters in the password are percent-encoded.

### 3. Create the database

```sql
CREATE DATABASE hrms;
```

### 4. Run database migrations

Migrations run automatically on server startup, but you can also run them manually:

```bash
cd server
npm run migrate          # apply all pending migrations
npm run migrate:status   # show which migrations are applied vs pending
```

Migrations are tracked in a `schema_migrations` table and are safe to re-run —
already-applied migrations are skipped. See
[`server/database/migrations`](server/database/migrations) for individual
migration files, and `server/run_migration.js` for the ordered list that gets
applied.

### 5. Start the app

Backend:

```bash
cd server
npm run dev      # nodemon, auto-restarts on changes
# or
npm start
```

Frontend:

```bash
cd client
npm run dev
```

The client runs on Vite's default dev server (typically `http://localhost:5173`)
and the API on `http://localhost:5001` (configurable via `PORT`).

## Available Scripts

**Server** (`server/package.json`)
| Script | Description |
|---|---|
| `npm run dev` | Start the API with nodemon (auto-restart) |
| `npm start` | Start the API |
| `npm run migrate` | Apply pending database migrations |
| `npm run migrate:status` | Show migration status without applying |

**Client** (`client/package.json`)
| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

## Core Modules

- **Employee Management** — employee profiles, onboarding, termination, leave balances
- **Leave Management** — leave requests, approvals, entitlements
- **HR Administration** — job titles, job categories, sub-units, HR users, audit trail
- **Roles & Access** — role-based access control
- **Reports & Notifications** — birthday/anniversary notifications, scheduled jobs

## Security Notes

- Never commit `server/.env` or real credentials. Use the placeholders above and
  keep actual secrets local or in your deployment environment's secret store.
- JWT auth is required on protected routes via `src/middleware/auth.middleware.js`.
