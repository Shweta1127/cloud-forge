# CloudForge Workspace

## Overview

CloudForge is a full-stack visual cloud infrastructure design tool. Users drag-and-drop AWS/Azure/GCP components onto a canvas, connect them, configure them, export as Terraform/CloudFormation/Kubernetes/YAML, validate misconfigurations, start from prebuilt templates, and chat with an AI architecture assistant.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild
- **Frontend**: React + Vite + Tailwind v4 (dark space theme)
- **Canvas**: @xyflow/react (ReactFlow v12)
- **AI**: OpenAI via Replit AI Integrations (auto-provisioned, gpt-4.1)

## Artifacts

- `artifacts/cloudforge` — React/Vite frontend at `/`
- `artifacts/api-server` — Express API server at `/api`
- `artifacts/cloudforge-mobile` — Expo React Native mobile app at `/mobile`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Critical Notes

- **`lib/api-zod/src/index.ts`** gets overwritten by orval codegen — after every codegen run, fix it to only contain: `export * from "./generated/api";`
- Use `@xyflow/react` (NOT `reactflow`) for the canvas
- Import React Query hooks from `@workspace/api-client-react` only
- OpenAI integration uses env vars `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned)

## Frontend Pages

- `/` — Dashboard: stats, recent projects, template quick-start
- `/projects` — Searchable/filterable project list
- `/editor/:projectId` — Visual canvas editor (main feature)
- `/templates` — Template gallery with category filter

## Editor Features

- Left sidebar: Component palette (32 components across AWS/Azure/GCP) with search and provider filter
- Canvas: Drag-and-drop from palette, connect nodes by dragging handles, select/move/delete
- Right panel: Properties panel for selected component (name, config fields, save)
- Toolbar: Validate (security + best practice checks), Export (Terraform/CloudFormation/K8s/YAML)
- AI chat: Floating chat panel powered by OpenAI, aware of current project context

## DB Schema

Tables: `projects`, `components`, `connections`, `templates`

## Mobile App (CloudForge Mobile)

Expo React Native companion app (Expo Go compatible, Android + iOS via Expo Go).

**Screens:**
- Dashboard — stats (projects, components), recent projects, quick actions
- Projects — searchable list of all projects, swipe-to-delete
- Templates — filtered template browser (by category)
- Project Detail (`/project/:id`) — component list, connection list, stats
- New Project (`/project/new`) — form to create project (name, description, provider)
- Template Detail (`/template/:id`) — template overview with "Use" to spawn project

**Design:** Dark CloudForge theme (`#0a0d12` bg, `#00d4ff` cyan accent), matches web app tokens exactly.

**API:** Uses `@workspace/api-client-react` generated hooks against the shared `/api` server.

**Base URL:** Set via `setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`)` in `_layout.tsx`.

## Provider Colors

- AWS: #FF9900
- Azure: #0078D4
- GCP: #4285F4
