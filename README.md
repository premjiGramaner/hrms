# HRMS Portal

This repository contains a simple HRMS portal with:

- **Backend:** Express.js + PostgreSQL
- **Frontend:** React + TypeScript + Vite
- **State management:** Redux Toolkit

## Folder structure

- `server/` - Express backend
  - `src/server.js` - backend entrypoint
  - `src/controllers/`, `src/routes/`, `src/middlewares/` - Express modules
  - `database/` - SQL schema, migrations, seeders

- `client/` - React frontend
  - `src/main.tsx` - app bootstrapping
  - `src/App.tsx` - main portal UI
  - `src/store/` - Redux Toolkit store setup
  - `src/index.css` - Tailwind CSS entry

## Setup

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

## Run locally

### Start backend

```bash
cd server
npm run dev
```

### Start frontend

```bash
cd client
npm run dev
```

## Notes

- The backend uses **Express.js** and is set up for **PostgreSQL**.
- The frontend uses **React + TypeScript** with **Tailwind CSS**.
- Redux Toolkit is included for global state management.
- The root `.gitignore` ignores node modules, build output, environment files, and editor metadata.
