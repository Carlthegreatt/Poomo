---
description: "Use when editing the Next.js frontend, App Router pages, React components, Zustand stores, server actions, or auth-related UI. Covers the Poomo frontend structure, hydration, optimistic updates, and repo-specific patterns."
applyTo: "frontend/**/*.{ts,tsx,js,jsx}"
---

# Frontend Guidelines

- Prefer the existing feature modules under `frontend/components/`, `frontend/stores/`, `frontend/lib/actions/`, and `frontend/lib/data/` over new shared abstractions.
- Keep cloud reads and writes behind the established auth flow: wait for `waitForAuthHydration()` and check `isCloudDataBackend()` before store-driven API calls.
- When a store already owns loading, hydration, or optimistic updates, extend that store instead of adding a second fetch path.
- Use server actions for mutations that already exist in the repo; validate input with Zod and return structured action results.
- Keep components small and local; use client components only when browser state or effects are required.
- Preserve the current App Router layout and link to [AGENTS.md](../../AGENTS.md) or [frontend/README.md](../../frontend/README.md) for broader context.

## Agent routing

- Start changes by locating the nearest store and action pair; only add new actions if no existing path owns the data.
- Avoid parallel data flows: do not fetch directly in UI if a store already manages loading or hydration.
- When adding UI, wire it to the existing store shape and selectors before creating new state.
- Keep file moves and directory reshuffles out of scope unless explicitly requested.
