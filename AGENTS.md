# Poomo Agent Guide

- This repo is a Next.js 15 app in [frontend/](frontend/) with an empty placeholder backend package in [backend/](backend/).
- Start with [frontend/package.json](frontend/package.json), [frontend/next.config.ts](frontend/next.config.ts), [frontend/middleware.ts](frontend/middleware.ts), [frontend/lib/data/authSession.ts](frontend/lib/data/authSession.ts), [frontend/lib/actions/](frontend/lib/actions/), [frontend/stores/](frontend/stores/), and [supabase/migrations/](supabase/migrations/).
- Use the frontend scripts for day-to-day work: `npm run dev`, `npm run build`, `npm run lint`, and `npm run test` from [frontend/package.json](frontend/package.json).
- Treat [backend/package.json](backend/package.json) as scaffolding unless you are intentionally adding a real backend service.
- The app uses Supabase SSR, App Router, Zustand stores, and server actions; prefer the existing repo/store/action patterns instead of introducing a second data flow.
- Before cloud reads or writes, follow the auth lifecycle in [frontend/lib/data/authSession.ts](frontend/lib/data/authSession.ts): check `isCloudDataBackend()` and await `waitForAuthHydration()`.
- Keep authentication assumptions aligned with [frontend/lib/auth/SUPABASE_SETUP.md](frontend/lib/auth/SUPABASE_SETUP.md) and the migrations under [supabase/migrations/](supabase/migrations/).
- Preserve the Turbopack/webpack `node-domexception` shim and CSP behavior in [frontend/next.config.ts](frontend/next.config.ts).
- Prefer linking to existing docs like [README.md](README.md) and [frontend/README.md](frontend/README.md) instead of restating long setup or architecture details here.
- When adding or changing a feature, inspect the nearest store, action, and UI component first so the edit matches the existing module boundaries.

## Workflow expectations

- Trace the data path before coding: locate the owning store, related server actions, and the closest UI feature module; extend that path instead of creating a new one.
- Before cloud reads or writes, follow the auth lifecycle in [frontend/lib/data/authSession.ts](frontend/lib/data/authSession.ts): check `isCloudDataBackend()` and await `waitForAuthHydration()`.
- Keep changes scoped to the smallest set of files that match existing patterns; avoid introducing new folders or abstractions unless the existing ones are insufficient.
- Preserve established UI/layout structure in App Router; match existing component conventions instead of redesigning.

## Verification

- For non-trivial frontend edits, run `npm run lint` from `frontend/`.
- Run tests when the touched area already has tests or when behavior changes are significant; otherwise skip tests to stay cost-efficient.
- If you skip tests or lint, say so explicitly in the update.
