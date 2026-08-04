# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Next.js dashboard that monitors the indexing/sync status of a Gnosis/Safe **Transaction Service** instance against Ethereum. The user pastes a transaction-service base URL (e.g. `https://transaction-ethereum.safe.protofire.io`); the app then polls that service's REST API client-side and renders ERC20 / Master Copies sync progress, speed, and ETA, plus RPC node status.

This repo is synced from a [v0.dev](https://v0.dev) project (see README.md) — changes made in v0.dev are pushed here automatically and deployed via Vercel.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml` is the lockfile in use).

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server (next dev)
pnpm build         # production build
pnpm start         # run production build
pnpm lint          # next lint
```

There is no test suite in this repository.

Note: `next.config.mjs` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`, so `pnpm build` will succeed even with lint or type errors. Run `pnpm lint` and `tsc --noEmit` explicitly when you need those checks enforced.

## Architecture

### Single-page, client-driven app

There is effectively one route: `app/page.tsx`. It is a large `"use client"` component that owns almost all state and drives three independent client-side data flows against the user-supplied base URL:

- `GET {baseUrl}/api/v1/about/` — service metadata + settings (`AboutData`/`Settings` interfaces defined in `app/page.tsx`), fetched once on submit and on manual refresh.
- `GET {baseUrl}/api/v1/about/ethereum-rpc` (and `.../ethereum-tracing-rpc` if `ETHEREUM_TRACING_NODE_URL` is set) — RPC node status, polled every 10s via `setTimeout` chains (not `setInterval`) stored in `rpcFetchTimeoutRef`/`tracingRpcFetchTimeoutRef`.
- `GET {baseUrl}/api/v1/about/indexing` — polled every 10s inside `components/IndexingStatus.tsx`, independently of the RPC polling above.

All of this is plain client-side `fetch` with no backend/API routes and no persisted storage — state lives only in the page and in the `?url=` query param (used so a URL can be shared/bookmarked; see `sanitizeUrl`/`isValidUrl`/`handleShareUrl` in `app/page.tsx`). The target transaction service must allow CORS from the app's origin.

### Type sharing runs backwards

`components/IndexingStatus.tsx` imports the `CurrentData` type from `@/app/page` (`import { CurrentData } from "@/app/page"`) — the component depends on the page, not the other way around. Keep this in mind if you rename/move things in `app/page.tsx`; the compile error will surface in the component, not obviously in the page.

### Indexing speed/ETA is recomputed from a rolling client-side buffer

`components/IndexingStatus.tsx` keeps up to the last hour of polled snapshots in state (`data`, filtered by `ONE_HOUR`) and derives `erc20Speed`/`masterCopiesSpeed`/ETA and the speed-over-time chart data (Chart.js via `react-chartjs-2`) from that buffer (`calculateRollingSpeed`, `calculateGraphSpeeds`). A `STALL_THRESHOLD`-based check flags "stalled" indexing when the last 10 polls show no block progress. There is no server aggregation — refreshing the page resets the history.

### Sidebar section-highlighting is DOM-driven, not prop-driven

`components/app-sidebar.tsx`'s `SidebarWrapper` detects which sections exist and which is active using `document.querySelectorAll`, a `MutationObserver`, and an `IntersectionObserver` against `<section id="...">` anchors in `app/page.tsx`, rather than receiving that state as props. It also stashes `hasActiveUrl`/`hasTracingRpc` as static properties on the `SidebarWrapper` function itself (`SidebarWrapper.hasActiveUrl = ...`) so `AppSidebar` (rendered separately for desktop) can read them. If you add/remove a scrollable section, update the `id` on the `<section>` in `app/page.tsx` and the corresponding `SidebarLink targetId` in `app/app-sidebar.tsx` together.

### UI components

`components/ui/*` is a standard shadcn/ui set generated via `components.json` (style: default, base color: neutral, icon library: lucide). Path aliases (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`) are defined both in `components.json` and `tsconfig.json`'s `@/*` mapping. Prefer extending `components/ui/*` primitives (Card, Button, Alert, Progress, Sidebar, etc.) over writing new raw markup.

Custom color utility classes (`bg-card-dark`, `border-card-dark`, `text-accent-blue`, `text-accent-cyan`) are hand-added at the bottom of `app/globals.css`, outside the standard shadcn CSS-variable theme — grep there before introducing a new one-off color class.
