# Nutsyll: Overall Structure for Claude

This repository is a monorepo foundation centered on a small app, a backend server, shared packages, and a custom control plane. The architecture is intentionally opinionated: the repo treats the workspace as the product, not as a nested project namespace.

## 1) High-level repository layout

```text
nutsyll/
├── .agent/                     # AI/agent operating instructions and standards
├── .github/                    # GitHub metadata and templates
├── .project/                  # project-local agent/project scaffolding
├── apps/
│   └── web/                   # Next.js web app
├── servers/
│   └── api/                   # API server runtime
├── packages/
│   ├── eslint-config/         # shared ESLint config
│   ├── logging/               # shared logging package
│   ├── tsconfig/              # shared TypeScript config presets
│   ├── types/                 # shared payload/environment types
│   └── ui/                    # shared UI component library (shadcn-style)
├── prebuilt/                  # reusable assembled solutions / future shared runtime pieces
├── enablers/                  # operational support / runtime enablers
├── codebase/                  # custom repository control plane
├── AGENTS.md                  # repository operating guidance
├── CLAUDE.md                  # Claude-specific instructions
├── README.md                  # repo overview
├── architecture.yaml          # authoritative architecture policy
├── package.json               # workspace scripts and package manager config
├── pnpm-workspace.yaml        # workspace package definition
├── pnpm-lock.yaml             # lockfile
├── commitlint.config.mjs
├── lint-staged.config.mjs
├── .editorconfig
├── .gitattributes
├── .gitignore
└── .trufflehog-exclude-paths.txt
```

## 2) Root architecture intent

The repo follows a strict separation between planes:

- Code plane: `apps/`, `servers/`, `packages/`, `prebuilt/`
- Control plane: `codebase/`
- Enabler plane: `enablers/`
- Agent plane: `.agent/`, `.project/`, `AGENTS.md`, `CLAUDE.md`, `architecture.yaml`

This is important because the repo intentionally does not use Turborepo/Nx/Lerna as the orchestration foundation. Instead, it relies on a custom control plane in `codebase/` for:

- repo discovery
- dependency graphing
- execution planning
- task orchestration
- caching
- repository policy
- result normalization
- CLI behavior

## 3) Workspace units and their responsibilities

### `apps/web`
This is the web application. It is a Next.js app with a feature-oriented structure.

Key folders/files:

```text
apps/web/
├── app/                       # Next.js app router
│   ├── (app)/
│   ├── (public)/
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
├── config/                    # app configuration and environment parsing
├── constants/
├── features/                  # feature-based UI modules
│   └── workspace-foundation/
├── tests/                     # integration / environment tests
├── types/
├── validation/
├── next.config.ts
├── package.json
├── project.json
├── tsconfig.json
└── eslint.config.mjs
```

Patterns to expect here:

- `app/` contains route pages and root layout
- `features/` groups app behavior by feature rather than by generic screen folders
- config/env validation is kept explicit and type-safe
- app-side code is not meant to own server behavior

### `servers/api`
This is the server runtime. It is organized around bootstrapping, configuration, and feature boundaries.

Key folders/files:

```text
servers/api/
├── bootstrap/
│   ├── create-app.ts
│   ├── create-server.ts
│   ├── index.ts
│   └── shutdown.ts
├── config/
├── constants/
├── features/
├── integrations/
├── validation/
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
└── ...
```

Architecture pattern:

- server features are flat by default
- optional role files may exist such as:
  - `*.route.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `*.repository.ts`
  - `*.validation.ts`
  - `*.model.ts`
  - `*.integration.ts`
- dependency flow is roughly:
  - route -> controller -> service -> repository/integration/domain

This follows the repo rule that HTTP features are composed in a minimal, explicit fashion rather than creating heavy abstractions too early.

### `packages/ui`
A shared UI package for reusable components and primitives.

Key structure:

```text
packages/ui/
├── src/
│   ├── components/
│   ├── compositions/
│   ├── hooks/
│   ├── primitives/
│   ├── styles/
│   ├── utilities/
│   └── index.ts
├── scripts/
├── components.json
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.build.json
└── eslint.config.mjs
```

This package follows the shadcn-style registry model and keeps UI primitives centralized. The repo explicitly configures UI component aliases and registry-driven generation.

### `packages/types`
Shared runtime contracts and typed API/environment definitions.

Typical content:

```text
packages/types/src/
├── api/
│   ├── environment/
│   ├── errors/
│   ├── health/
│   └── index.ts
├── index.ts
└── ...
```

This package is for genuine cross-workspace contracts; local one-off contracts stay near the feature or runtime that owns them.

### `packages/logging`
Shared logging abstraction and HTTP logging helpers.

Typical structure:

```text
packages/logging/src/
├── http.ts
├── index.ts
├── logger.ts
├── types.ts
└── tests/
```

### `packages/eslint-config` and `packages/tsconfig`
Shared config packages used to align linting and TypeScript rules across workspace units. These are infra/config packages rather than product logic.

## 4) Control plane (`codebase/`)

The control plane is the repo’s custom orchestration layer. It is not app code. It owns the repository-specific mechanics.

Important files:

```text
codebase/
├── affected/
├── cache/
├── checks/
├── cli/
├── configuration/
├── contracts/
├── execution/
├── generators/
├── graph/
├── projects/
├── scans/
├── security/
├── tools/
├── utilities/
├── validators/
├── workspace/
├── ... tests
```

It is responsible for things like:

- workspace discovery
- dependency graph generation
- task execution ordering
- validation and policy checks
- dependency scanning
- security scanning integrations
- CLI commands for repo-wide operations

This is the part of the repo that implements internal repo governance rather than application features.

## 5) Architecture rules that matter for Claude

These rules are central to working correctly in this repo:

- Keep workspace units directly under the root (`apps/`, `servers/`, `packages/`, etc.)
- Prefer feature-first organization over broad vertical folders
- Server features are flat by default; only split by role when needed
- `packages/` cannot import `apps`, `servers`, or `prebuilt`
- app/server/package boundaries are explicit and should not be crossed casually
- domain-level code must not import routes/controllers/models/infrastructure wrappers
- `codebase/` owns orchestration; it is not an app or feature runtime
- `enablers/` is for operational capability, not business/domain logic

## 6) Tooling and repo commands

The repo uses pnpm as the package manager and custom CLI scripts for repo management.

Useful commands from repo conventions:

```bash
pnpm run projects
pnpm run graph
pnpm run tasks
pnpm run dev
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run check
pnpm run scan
pnpm test
```

Repository control-plane command pattern:

```bash
node codebase/cli/repo.mjs run <task>
```

This is the repo’s entry point for task orchestration and discovery.

## 7) What a Claude agent should assume

When modifying this repo, assume:

- this is a monorepo, not a single app
- product code is mostly in `apps/` and `servers/`
- shared reusable behavior belongs in `packages/`
- infrastructure orchestration is in `codebase/`
- architecture and boundaries are enforced by conventions and config
- feature ownership matters more than arbitrary directory naming

## 8) Practical working model

If you need to work on a feature, start by identifying the relevant workspace unit:

- UI work -> likely `apps/web` or `packages/ui`
- API work -> likely `servers/api`
- shared contract/type changes -> likely `packages/types`
- repo automation or repo validation -> likely `codebase/`

Then follow the repo’s feature-first rules and keep the dependency direction clean.

## 9) Short summary

Nutsyll is a modular monorepo foundation with:

- a Next.js frontend in `apps/web`
- a TypeScript API server in `servers/api`
- shared packages in `packages/*`
- a custom repo control plane in `codebase/`
- operational support in `enablers/`
- AI/architecture instructions in `.agent/`, `AGENTS.md`, and `CLAUDE.md`

This structure is designed to scale from simple app/server code into a more modular, bounded monorepo without introducing heavyweight orchestration frameworks.
