# AGENTS.md — saas-frontend-blueprint

> Loaded by Copilot and other VS Code agents as workspace context.
> Full instructions in `.github/copilot-instructions.md`. Rules in `.claude/rules/`.

---

## Project summary

Multi-tenant SaaS frontend — **Nx 22**, **Angular 21**, **Webpack Module Federation**.
Four apps: shell (host MFE, 4200), auth (remote, 4201), platform (remote, 4202), admin (standalone SPA, 4203).
Backend: [saas-backend-blueprint](../saas-backend-blueprint) (NestJS 11 + Prisma 7).

## Key conventions (non-negotiable)

- `ChangeDetectionStrategy.OnPush` always
- Standalone components only, inline templates, Tailwind CSS v4 for styling
- `inject()` for all DI — `readonly #field = inject(Service)` — never constructor injection
- Angular Signals (`signal()`, `computed()`) — no BehaviorSubject, no NgRx
- API services: `providedIn: 'root'`, return `Observable<T>`, never subscribe internally
- Types from OpenAPI only — `import type { components } from '@saas-frontend/shared/util-types'`
- `@saas-frontend/*` path aliases — import from barrel `index.ts`
- MFE: share `@saas-frontend/*` as singletons, re-provide `API_BASE_URL` + `*Api` in remote `providers[]` (shell/auth/platform only — admin is standalone)
- Tests: Vitest 4 + jsdom, co-located `.spec.ts`, mock all APIs, `httpMock.verify()` in `afterEach`
- Security: Auth0 SDK manages JWTs, `tenantInterceptor` for `x-org-id`, no secrets in `environment.ts`

## Commands

```sh
npx nx serve shell --devRemotes=auth,platform   # dev (admin served separately)
npx nx serve admin                               # admin dev
npx nx run-many -t test --all                   # tests
npx nx run-many -t lint --all                   # lint
npx nx run-many -t typecheck --all              # type-check
```

## Where to find detail

| Topic                     | File                              |
| ------------------------- | --------------------------------- |
| Full Copilot instructions | `.github/copilot-instructions.md` |
| Architecture patterns     | `.claude/rules/architecture.md`   |
| Code style rules          | `.claude/rules/code-style.md`     |
| Testing rules             | `.claude/rules/testing.md`        |
| Security rules            | `.claude/rules/security.md`       |
| Contributing guide        | `CONTRIBUTING.md`                 |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
