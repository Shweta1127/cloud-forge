# CloudForge

A full-stack visual cloud infrastructure design tool. Drag and drop AWS, Azure, and GCP components onto a canvas, connect them, configure them, and export to Terraform, CloudFormation, Kubernetes, or YAML — all from the browser or mobile app.

---

## Features

- **Visual canvas editor** — drag-and-drop infrastructure components, draw connections between them, and configure each node's properties
- **32 cloud components** — EC2, VPC, Lambda, RDS, S3, EKS, AKS, Cloud Run, BigQuery, and more across AWS / Azure / GCP
- **Terraform import** — upload a `.tf` file when creating a project to auto-generate a diagram with detected resources, dependencies, and auto-layout
- **Export** — generate Terraform HCL, CloudFormation, Kubernetes manifests, or plain YAML from any diagram
- **Validation** — built-in security and best-practice checks that highlight misconfigurations on the canvas
- **Templates** — prebuilt architecture patterns (3-tier web app, serverless microservices, multi-cloud networking, and more) to start from
- **AI assistant** — floating chat panel powered by GPT-4.1, context-aware of the current project
- **Mobile companion app** — Expo React Native app (iOS + Android) for browsing projects and templates on the go

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Language | TypeScript 5.9, Node.js 24 |
| Frontend | React + Vite + Tailwind v4 |
| Canvas | @xyflow/react (ReactFlow v12) |
| Mobile | Expo (React Native) |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod, drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| AI | OpenAI GPT-4.1 via Replit AI Integrations |
| Build | esbuild |

---

## Project Structure

```
artifacts/
  cloudforge/          # React + Vite web app  →  /
  api-server/          # Express API server     →  /api
  cloudforge-mobile/   # Expo mobile app        →  /mobile

lib/
  api-spec/            # OpenAPI specification (source of truth)
  api-client-react/    # Generated React Query hooks (via Orval)
  api-zod/             # Generated Zod schemas (via Orval)
  db/                  # Drizzle ORM schema + migrations
```

---

## How to Run

### Prerequisites

- [Node.js 24+](https://nodejs.org/)
- npm 10+ (included with Node.js)
- A PostgreSQL database — set the connection string as `DATABASE_URL` in your environment

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root (or export these in your shell):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cloudforge
SESSION_SECRET=your-secret-here
```

### 3. Push the database schema

```bash
npm run push -w @workspace/db
```

This creates all tables (`projects`, `components`, `connections`, `templates`).

### 4. Start all services

Each service runs independently. Open three terminals:

```bash
# Terminal 1 — API server (port from $PORT, defaults to 8080)
npm run dev -w @workspace/api-server

# Terminal 2 — Web app (port from $PORT, defaults to 5173)
npm run dev -w @workspace/cloudforge

# Terminal 3 — Mobile app (Expo)
npm run dev -w @workspace/cloudforge-mobile
```

Then open:

| App | URL |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:8080/api |
| Mobile (Expo Go) | Scan the QR code shown in Terminal 3 |

> **On Replit** — all three services start automatically via configured workflows. No manual setup needed.

---

## Key Commands

```bash
# Full typecheck across all packages
npm run typecheck

# Regenerate API hooks and Zod schemas from the OpenAPI spec
npm run codegen -w @workspace/api-spec

# Push DB schema changes (development only)
npm run push -w @workspace/db
```

> After every codegen run, ensure `lib/api-zod/src/index.ts` contains only:
> `export * from "./generated/api";`

---

## Web App Pages

| Path | Description |
|---|---|
| `/` | Dashboard — stats, recent projects, quick-start templates |
| `/projects` | Searchable and filterable project list |
| `/editor/:projectId` | Visual canvas editor |
| `/templates` | Template gallery with category filter |

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get a project |
| DELETE | `/api/projects/:id` | Delete a project |
| GET | `/api/projects/recent` | Recent projects |
| GET/POST | `/api/components` | List / create components |
| GET/POST | `/api/connections` | List / create connections |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/templates/:id/use` | Create a project from a template (copies all components & connections) |
| POST | `/api/import/terraform` | Parse a `.tf` file and create a project with diagram |
| POST | `/api/export` | Export project to Terraform / CloudFormation / K8s / YAML |
| POST | `/api/validate` | Validate project for misconfigurations |
| POST | `/api/ai/chat` | AI architecture assistant |

---

## Database Schema

| Table | Description |
|---|---|
| `projects` | Infrastructure projects (name, description, provider) |
| `components` | Canvas nodes (type, provider, position, config) |
| `connections` | Edges between components (source, target, type) |
| `templates` | Prebuilt architecture templates |

---

## Mobile App

The Expo companion app targets iOS and Android (Expo Go compatible).

**Screens:**

- **Dashboard** — project stats and recent projects
- **Projects** — searchable project list with swipe-to-delete
- **Templates** — filterable template browser
- **Project Detail** — component and connection breakdown
- **New Project** — create a project by name, description, and provider
- **Template Detail** — template overview with one-tap project creation

---

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| Background | `#0a0d12` | App background |
| Accent / Primary | `#00d4ff` | Cyan — buttons, links, highlights |
| Danger | `#ff4466` | Errors and destructive actions |
| Success | `#00d488` | Confirmations |
| AWS | `#FF9900` | Provider badge |
| Azure | `#0078D4` | Provider badge |
| GCP | `#4285F4` | Provider badge |

Fonts: **Syne** (headings) · **JetBrains Mono** (code / editor labels)
