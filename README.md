# Queueless

> A platform that helps users shop smarter by comparing prices across nearby stores, checking product availability, and avoiding unnecessary queues and shopping trips.

**Team:** CoPilot

**The problem it solves:** Shoppers often don't know which nearby store has the best price, or whether a product is even in stock, until they get there. That leads to wasted trips, long queues and overspending. Queueless brings prices, stock availability and queue information from nearby stores into one place, so users can decide where to shop before they leave home.

## 🔗 Links

| Resource       | Link                                                     |
| -------------- | -------------------------------------------------------- |
| Live app       | _TODO_                                                   |
| Stitch project | [Queueless on Stitch](https://stitch.withgoogle.com/projects/14854798444949179025) |
| Project board  | [Queueless Board](https://github.com/users/mpho09/projects/1) |
| Team Loom      | _TODO_                                                   |
| PRD            | [docs/PRD.md](docs/PRD.md)                               |
| Designs        | [docs/designs/](docs/designs/) (exported screens: `screen.png` + `code.html`) |
| Implementation | [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |

## 📋 Project Documentation

We use the Product Requirements Document (PRD) as our single source of truth for features, business logic and database schemas. Make sure the PRD is updated and approved before editing any core code.

- **[Product Requirements Document (PRD)](docs/PRD.md)**: core specification, user stories, screen flows, data model and compliance rules.
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)**: step-by-step build sequence, tech stack configuration and automated testing definitions.

## 👥 Team & Roles

| Name    | GitHub                                                       | Role(s)                        | Main features built |
| ------- | ------------------------------------------------------------ | ------------------------------ | ------ |
| Mpho    | [@mpho09](https://github.com/mpho09)                         | Tech Lead, Backend Dev         | _TODO_ |
| Joy     | [@jjmolomo17-tech](https://github.com/jjmolomo17-tech)       | Product Owner, Frontend Dev    | _TODO_ |
| Refilwe | [@Ref-DevSa](https://github.com/Ref-DevSa)                   | Frontend Dev, Designer         | _TODO_ |
| Elias   | [@eliasmtisie4321](https://github.com/eliasmtisie4321)       | QA, DevOps                     | _TODO_ |
| Kabelo  | [@kabelomathapo6-lab](https://github.com/kabelomathapo6-lab) | Designer, Frontend Dev         | _TODO_ |

## ✨ Features

Status key: ✅ done · 🚧 in progress

### Must have

| Feature | Status | Owner  |
| ------- | ------ | ------ |
| _TODO_  | 🚧     | _TODO_ |

### Should have

| Feature | Status | Owner  |
| ------- | ------ | ------ |
| _TODO_  | 🚧     | _TODO_ |

## 🧱 Tech Stack & Architecture

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19, Vite 8 (Three.js planned for 3D)   |
| API      | Node.js, Express 5                           |
| Database | Supabase (PostgreSQL, Auth, Row Level Security) |
| Tooling  | npm workspaces, Supabase CLI, GitHub Actions |

```
┌──────────────────────┐    /api/*     ┌──────────────────────┐   service role   ┌──────────────────┐
│  client/ (React +    │ ────────────▶ │  server/ (Express)   │ ───────────────▶ │                  │
│  Vite, port 5173)    │               │  port 3001           │                  │     Supabase     │
│                      │ ──────────────────── anon key + RLS ─────────────────▶ │  (Postgres/Auth) │
└──────────────────────┘                                                         └──────────────────┘
```

- **Frontend (`client/`)** — the React single-page app. In development, Vite forwards `/api/*` requests to the server. The browser uses the Supabase **anon key** for auth and for reads that Row Level Security allows ([client/src/lib/supabase.js](client/src/lib/supabase.js)).
- **API (`server/`)** — the Express REST API for business logic and privileged operations. It talks to Supabase with the **service role key**, which never leaves the server ([server/src/lib/supabase.js](server/src/lib/supabase.js)). In production it also serves the built client from `client/dist`.
- **Database (`supabase/`)** — SQL migrations live in [supabase/migrations/](supabase/migrations/) and test data in [supabase/seed.sql](supabase/seed.sql).

```
Queueless/
├── client/          React + Vite app
├── server/          Express API
├── supabase/        Supabase config, migrations and seed
└── .github/         CI workflows
```

## 💻 Run It Locally

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ (built and tested on 22)
- Access to the team's hosted Supabase project (ask the Tech Lead). We don't run Supabase locally, so Docker is **not** needed
- Git

### 1. Install

```bash
git clone <repo-url>
cd Queueless
npm install          # installs client, server and the Supabase CLI
```

### 2. Environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

| File          | Variable                    | Description                                          |
| ------------- | --------------------------- | ---------------------------------------------------- |
| `server/.env` | `PORT`                      | API port (default `3001`)                            |
| `server/.env` | `SUPABASE_URL`              | Supabase project URL                                 |
| `server/.env` | `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **Server only, never commit it.**  |
| `client/.env` | `VITE_SUPABASE_URL`         | Supabase project URL                                 |
| `client/.env` | `VITE_SUPABASE_ANON_KEY`    | Public anon key                                      |

Find the values under **Supabase Dashboard → Project Settings → API**, or ask the Tech Lead for them privately. Never post keys in the team thread or commit them.

### 3. Database: migrations & seed

We use **one shared hosted Supabase project** (no local database, no Docker). Every database change is a migration file merged through a PR; never edit tables by hand in the dashboard.

```bash
npm run db:link -- --project-ref <project-ref>   # once per computer (Tech Lead shares the ref)
npm run db:migration -- <name>                   # create a new migration file
npm run db:check                                 # dry run: shows which migrations would be applied
```

After a migration PR is **merged into main**, the Tech Lead applies it:

```bash
npm run db:push      # apply new migrations to the hosted project
npm run db:seed      # apply migrations and load supabase/seed.sql
npm run db:test      # run the database tests in supabase/tests/ against the hosted project
```

| Command | Description |
| --- | --- |
| `npm run db:link -- --project-ref <ref>` | Link this folder to the hosted project |
| `npm run db:migration -- <name>` | Create a new migration file |
| `npm run db:check` | Dry run: list migrations that would be applied |
| `npm run db:push` | Apply new migrations to the hosted project |
| `npm run db:seed` | Apply migrations and load the seed data |
| `npm run db:test` | Run the database tests against the hosted project |
| `npm run db:reset:hosted` | ⚠️ **Wipes the shared database** and rebuilds it from migrations + seed. Tech Lead only, and tell the team first |

The shared database is used by everyone and by the live site, so only push migrations that have been reviewed and merged.

### 4. Start

```bash
npm run dev          # starts the client (http://localhost:5173) and the API (http://localhost:3001)
```

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the client and server in watch mode        |
| `npm run dev:client` | Start only the Vite dev server                   |
| `npm run dev:server` | Start only the API server                        |
| `npm run build`      | Build the client into `client/dist`              |
| `npm start`          | Start the server (serves `client/dist` when `NODE_ENV=production`) |

## 🔑 Test Logins

> ⚠️ These are **test accounts only**, created by `supabase/seed.sql`. Never put real credentials here.

| Role   | Email  | Password |
| ------ | ------ | -------- |
| _TODO_ | _TODO_ | _TODO_   |

## 🧪 Tests

_TODO: no test suite yet._

```bash
# TODO: npm test
```

| Area   | What's covered |
| ------ | -------------- |
| _TODO_ | _TODO_         |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request and push to `main`. It checks for leftover merge conflict markers and invalid JSON files.

## 🚀 Deployment

| Part     | Hosted on | Redeploys when |
| -------- | --------- | -------------- |
| Frontend | _TODO_    | _TODO_         |
| API      | _TODO_    | _TODO_         |
| Database | Supabase  | Migrations pushed with `npm run db:push` _(TODO: confirm process)_ |

## 📸 Screenshots

_TODO: add screenshots or a GIF of the main screens (for example in `docs/screenshots/`)._

<!-- ![Home screen](docs/screenshots/home.png) -->

## 🐞 Known Issues & What's Next

### Known issues

- _TODO_

### What we'd build next

- 3D experience with Three.js (planned for a later stage)
- _TODO_

## 🤝 How We Work

### Branch naming

_TODO: confirm the convention._ Suggested:

| Type     | Pattern                     | Example                    |
| -------- | --------------------------- | -------------------------- |
| Feature  | `feature/<short-name>`      | `feature/join-queue`       |
| Bug fix  | `fix/<short-name>`          | `fix/login-redirect`       |
| Chore    | `chore/<short-name>`        | `chore/update-deps`        |

### Pull request rules

_TODO: confirm the rules._ Suggested:

- Never push directly to `main`. All changes go through a pull request.
- Keep PRs small and focused on one feature or fix.
- Link the related Issue (`Closes #12`) so its card on the [project board](https://github.com/users/mpho09/projects/1) moves to Done.
- CI must pass before merging.
- Include screenshots for UI changes.

### Review process

_TODO: confirm the process._ Suggested:

- At least **one approval** from another team member before merging.
- The reviewer checks that the code works locally, matches the designs, and does not commit secrets.
- The PR author merges once approved and deletes the branch afterwards.
