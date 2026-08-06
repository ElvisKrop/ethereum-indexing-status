# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Next.js dashboard that monitors the indexing/sync status of one or more Gnosis/Safe **Transaction Service** instances against Ethereum. The user adds one or more transaction-service base URLs (e.g. `https://transaction-ethereum.safe.protofire.io`); the app polls each service's REST API client-side and renders ERC20 / Master Copies sync progress, speed, ETA, and RPC node status.

This repo is synced from a [v0.dev](https://v0.dev) project (see README.md) — changes made in v0.dev are pushed here automatically and deployed via Vercel.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml` is the lockfile in use).

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server (next dev)
pnpm build         # production build
pnpm start         # run production build
pnpm lint          # eslint . (flat config, see eslint.config.mjs)
```

There is no test suite in this repository.

Note: `next.config.mjs` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`, so `pnpm build` will succeed even with lint or type errors. Run `pnpm lint` and `tsc --noEmit` explicitly when you need those checks enforced.

## Architecture

### Two routes, both client-driven, no backend

- **`app/page.tsx`** (`/`) — reads all `url` search params (`?url=A&url=B`). Zero params → `<AddServicesForm>` (dynamic list of URL inputs). One param → redirects to `/service`. Two or more → `<ServicesTable>`, one lightweight-polling `<ServiceRow>` per tracked URL (`hooks/useServiceSummary.ts`).
- **`app/service/page.tsx`** (`/service?url=...`) — the full single-service detail view: service info/settings, RPC + tracing-RPC status, and `<IndexingStatus>` (charts). Reads a single `url` param.

All data comes from plain client-side `fetch` against the user-supplied base URL(s) — no API routes, no server aggregation. The target transaction service must allow CORS from the app's origin.

### State lives in the URL, mirrored to localStorage

The `?url=` query string is the source of truth for what's rendered on `/` at any moment (so a dashboard link is always shareable/bookmarkable) — see `sanitizeUrl`/`isValidUrl`/`buildUrlsQuery` in `lib/service-url.ts`. `lib/tracked-services-storage.ts` mirrors that list to `localStorage` so it survives a restart: `/` bootstraps its query string from storage when loaded with no params, and every add/remove writes back.

Per-service *status* (ERC20/Master Copies sync %, speed, ETA, RPC state, last-updated timestamp) is separately cached in `localStorage` via `lib/service-status-cache.ts`, keyed by URL. Both `hooks/useServiceSummary.ts` (table row poller) and `components/IndexingStatus.tsx` + `app/service/page.tsx` (detail view) read/write the **same** cache entries (`mergeCachedServiceStatus`), so status learned by one view is visible in the other immediately on mount, instead of a blank "Loading..." every time a component remounts.

Row links to `/service` carry the rest of the tracked list as `from=` params (see `components/ServiceRow.tsx`) so `/service`'s "Back to Dashboard" button can reconstruct the full multi-service list — a bare `/service?url=X` link has no other way to know what else was being tracked.

### Indexing speed/ETA: two independent implementations sharing the same math

`components/IndexingStatus.tsx` (detail view) keeps up to the last hour of polled snapshots in state, filtered by `ONE_HOUR`, for its speed/ETA/chart data. `hooks/useServiceSummary.ts` (table row) keeps only a short `STALL_THRESHOLD`-sized ring buffer — it doesn't need chart history, just the current speed. Both call the same pure functions in `lib/indexing-metrics.ts` (`calculateRollingSpeed`, `calculateETA`) so the math itself isn't duplicated, only the buffer size differs.

### Sidebar section-highlighting is DOM-driven, not prop-driven

`components/app-sidebar.tsx`'s `SidebarWrapper` detects which sections exist and which is active using `document.querySelectorAll`, a `MutationObserver`, and an `IntersectionObserver` against `<section id="...">` anchors, sharing that state (`activeSection`/`hasActiveUrl`/`hasTracingRpc`) via `MobileSidebarContext`. `SidebarWrapper` only wraps `/service` (the route with those anchors) — `/`'s table/form page renders without it. If you add/remove a scrollable section on `/service`, update the `id` on the `<section>` in `app/service/page.tsx` and the corresponding `SidebarLink targetId` in `components/app-sidebar.tsx` together.

### Theming: light/dark via next-themes

`app/globals.css` defines a light `:root` (default) and a `.dark` override block of CSS variables (`--background`, `--muted-foreground`, etc.), matching `tailwind.config.js`'s `darkMode: ["class"]`. `components/theme-provider.tsx` (wrapping `next-themes`) is mounted in `app/layout.tsx` with `defaultTheme="dark"` — the app's dark appearance is unchanged from before unless a user flips `components/theme-toggle.tsx`'s switch (in the `/` header and in `app-sidebar.tsx`'s footers).

Structural colors (page/card backgrounds, borders, muted text) use the semantic classes (`bg-background`, `text-muted-foreground`, etc.). Everything else — the cyan/fuchsia/emerald/amber status-accent scheme, and Chart.js's line/gridline/tick colors in `components/IndexingStatus.tsx` (plain JS constants, not CSS, so they need `useTheme()` directly, guarded by a `mounted` flag to avoid a hydration mismatch) — is given an explicit `dark:`-prefixed pair per usage. When adding new UI, follow the same pattern: pick a light-mode value first, add the `dark:` variant matching today's existing dark palette, and check contrast (WCAG AA, 4.5:1) on both backgrounds rather than reusing a bright/dark-tuned shade as-is.

### UI components

`components/ui/*` is a standard shadcn/ui set generated via `components.json` (style: default, base color: neutral, icon library: lucide). Path aliases (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`) are defined both in `components.json` and `tsconfig.json`'s `@/*` mapping. Prefer extending `components/ui/*` primitives (Card, Button, Alert, Progress, Sidebar, Table, Switch, etc.) over writing new raw markup.

Custom color utility classes (`bg-card-dark`, `border-card-dark`, `text-accent-blue`, `text-accent-cyan`) are hand-added at the bottom of `app/globals.css`, outside the standard shadcn CSS-variable theme — grep there before introducing a new one-off color class. They already carry `.dark`-scoped overrides following the theming convention above.
