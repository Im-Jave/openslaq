# Engineering Backlog (Active)

How to use this doc:
- Track architecture, platform quality, test reliability, and refactor work.
- Keep only open or in-progress work here.
- Move completed work to archive snapshots.

## E-001: Message Domain Service Decomposition
- Status: Open
- Impact: Medium
- Owner: API team
- Estimate: Medium
- Dependencies: test coverage around message serialization/enrichment
- Summary: Split oversized message service into read/write/serializer/enricher modules.
- Acceptance criteria:
  - Message read and write responsibilities are separated.
  - Behavior remains identical for existing message API flows.

## E-002: Reusable API Route Builders
- Status: Open
- Impact: Medium
- Owner: API team
- Estimate: Medium
- Dependencies: common OpenAPI/response helper design
- Summary: Extract repeated route patterns into reusable builders.
- Acceptance criteria:
  - Shared parameter schemas and standard response helpers are used across domains.
  - Duplicate route boilerplate is reduced in targeted modules.

## E-003: Socket Lifecycle Modularization
- Status: Open
- Impact: Medium
- Owner: Realtime team
- Estimate: Medium
- Dependencies: clear event and room lifecycle contracts
- Summary: Split socket lifecycle logic by concern (auth, room sync, presence, typing, huddle hooks).
- Acceptance criteria:
  - Each concern is isolated in focused modules.
  - Existing socket events and behavior remain stable.

## E-004: Mobile Conversation Screen Deduplication
- Status: Open
- Impact: Medium
- Owner: Mobile team
- Estimate: Medium
- Dependencies: shared screen abstraction and typed route adapters
- Summary: Merge near-identical channel/DM screens into shared conversation surface.
- Acceptance criteria:
  - Shared conversation implementation is used by both channel and DM routes.
  - Header/param differences are handled by lightweight adapters.

## E-005: Admin Table Query/Pagination Reuse
- Status: Open
- Impact: Medium
- Owner: Web team
- Estimate: Medium
- Dependencies: generic admin table contract
- Summary: Deduplicate admin tab paging/search behavior.
- Acceptance criteria:
  - Shared pagination/query hook is adopted by users/workspaces tabs.
  - Existing admin behavior remains unchanged.

## E-006: Optimistic Reaction Logic Consolidation
- Status: Open
- Impact: Medium
- Owner: Web + client-core teams
- Estimate: Medium
- Dependencies: client-core operation boundaries
- Summary: Keep optimistic reaction logic in client-core and remove duplicate web implementation.
- Acceptance criteria:
  - Web delegates reaction optimistic updates to client-core.
  - Duplicate logic paths are removed without behavior regressions.

## E-007: Exhaustive-Deps Cleanup
- Status: Open
- Impact: Medium
- Owner: Web + Mobile teams
- Estimate: Medium
- Dependencies: stable dependency helper patterns
- Summary: Replace hook dependency suppressions with stable patterns.
- Acceptance criteria:
  - Targeted suppressions are removed.
  - Hook behavior remains correct under re-render stress.

## E-008: OpenAPI Schema Consolidation
- Status: Open
- Impact: Medium
- Owner: API + Shared teams
- Estimate: High
- Dependencies: shared type/schema source-of-truth approach
- Summary: Move toward shared domain schema sources and reduce hand-maintained OpenAPI drift.
- Acceptance criteria:
  - Shared schema source is adopted for prioritized domains.
  - OpenAPI output remains compatible with current consumers.

## E-009: Rate Limit Middleware Simplification
- Status: Open
- Impact: Low
- Owner: API team
- Estimate: Low
- Dependencies: generic limiter config shape
- Summary: Simplify duplicated rate-limit middleware branches with one factory.
- Acceptance criteria:
  - Middleware supports user-ID and IP keys via pluggable resolver.
  - Behavior and limits remain unchanged.

## E-010: CI and Operational Quality
- Status: Open
- Impact: High
- Owner: Platform team
- Estimate: Medium
- Dependencies: CI provider and artifact policy
- Summary: Add CI for lint/typecheck/e2e smoke and structured API logging.
- Acceptance criteria:
  - CI runs lint + typecheck on each PR.
  - CI runs API and web smoke tests.
  - API logging has a documented structured format.

## E-011: Orphan Attachment Cleanup
- Status: Open
- Impact: Medium
- Owner: API team
- Estimate: Medium
- Dependencies: background job scheduling approach
- Summary: Add TTL cleanup and owner delete flow for unattached uploads.
- Acceptance criteria:
  - Unattached uploads older than TTL are cleaned up automatically.
  - Uploader can delete unattached uploads explicitly via API.

## E-012: Web E2E Speed and Flake Reduction
- Status: Open
- Impact: High
- Owner: Web E2E team
- Estimate: Medium
- Dependencies: fixture strategy and deterministic waits
- Summary: Reduce hard waits and per-test setup churn to improve reliability and runtime.
- Acceptance criteria:
  - Hardcoded timeout waits are reduced in high-traffic specs.
  - Median suite runtime improves measurably.
  - Flake rate declines across repeated CI runs.

## E-013: Web E2E Coverage Expansion
- Status: Open
- Impact: Medium
- Owner: Web E2E team
- Estimate: Medium
- Dependencies: coverage report workflow
- Summary: Expand Playwright coverage for high-value UI flows.
- Acceptance criteria:
  - Coverage report identifies and tracks uncovered critical flows.
  - New tests cover channel creation, settings, search, threads, and pagination.

## E-014: Typecheck Performance — Pre-emit API Declarations
- Status: Open
- Impact: High
- Owner: Platform team
- Estimate: Low
- Dependencies: none
- Summary: Monorepo typecheck is bottlenecked by Hono AppType inference. Every package that depends on `AppType` (client-core, web, mobile, api-e2e) re-infers the full route chain from API source, taking ~35s each. Pre-emitting `.d.ts` declarations for the API package and adding a staleness-aware pretypecheck script reduces consumer typechecks from ~35s to ~1s when API routes haven't changed.

### Problem

`apps/api/src/app.ts` exports `AppType = typeof routes`, where `routes` is a 14-deep `.route()` chain across 19 route files with OpenAPIHono, Zod schemas, and middleware. TypeScript must fully elaborate this deeply nested conditional type to resolve `AppType`. This takes ~35s.

Because `@openslaq/api` exports raw `.ts` source (`"./app": "./src/app.ts"`), every consumer that imports `AppType` (directly or transitively via client-core) re-computes this from scratch:
- `@openslaq/api` — 35s (source of truth)
- `@openslaq/client-core` — 35s (imports `AppType` directly)
- `@openslaq/web` — 35s (imports client-core → AppType)
- `@openslaq/mobile` — 35s (imports client-core → AppType)
- `@openslaq/api-e2e` — 35s (imports `AppType` directly)

Packages that don't touch AppType (shared, editor, huddle, web-e2e) typecheck in ~1s.

### Solution

1. Add a `build:types` script to `@openslaq/api` that runs `tsc --emitDeclarationOnly --outDir dist` to generate `.d.ts` files (including the pre-computed `AppType`).
2. Update `@openslaq/api/package.json` exports to use conditional exports so TypeScript resolves the `.d.ts` while Bun runtime still uses `.ts` source:
   ```json
   "exports": {
     "./app": {
       "types": "./dist/app.d.ts",
       "default": "./src/app.ts"
     }
   }
   ```
3. Add a staleness-aware pretypecheck script that only re-runs `build:types` when API source has changed. Use a marker file (`dist/.types-stamp`) and `find apps/api/src -newer dist/.types-stamp -name '*.ts'` to detect changes. If no files are newer, skip the rebuild (~0.1s check).
4. Add `apps/api/dist/` to `.gitignore`.

### Expected performance

| Scenario | Before | After |
|---|---|---|
| Full typecheck, no API changes | ~35s wall / ~175s CPU | ~2s wall / ~7s CPU |
| Full typecheck, after API change | ~35s wall / ~175s CPU | ~37s wall / ~42s CPU |
| Single consumer typecheck (e.g. web) | ~35s | ~1s (no API changes) |

- Acceptance criteria:
  - `build:types` script emits declarations for `@openslaq/api`.
  - Pretypecheck script skips rebuild when no API source files have changed.
  - Consumer packages resolve `AppType` from `.d.ts` and typecheck in ~1-2s when API is unchanged.
  - Full `bun run typecheck` completes in under 5s when API source is unchanged.
