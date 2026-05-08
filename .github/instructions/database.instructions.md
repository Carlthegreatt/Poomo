---
description: "Use when writing Supabase migrations, RLS policies, RPCs, or cloud data helpers. Covers schema evolution, user-scoped access, and migration safety."
applyTo: "supabase/migrations/**/*.sql, frontend/lib/data/cloud/**/*.ts, frontend/lib/actions/**/*.ts, frontend/lib/supabase/**/*.ts"
---

# Database Guidelines

- Add new migrations instead of editing applied migrations.
- Keep schema changes user-scoped with `auth.uid()` RLS policies unless the table is intentionally public.
- Add supporting indexes when a query filters by `user_id` plus sort or order columns.
- Prefer RPCs for batch reorder or multi-row updates; keep SQL functions and policies in the same migration when they depend on each other.
- In server actions, fetch the signed-in user with `getServerSessionUser()` before calling cloud helpers.
- In cloud write helpers, use `requireDataUserId()` only where needed; if an RPC is already protected by RLS, avoid redundant auth checks.
- Keep examples close to existing migrations like [supabase/migrations/20260411120000_initial_schema.sql](../../supabase/migrations/20260411120000_initial_schema.sql).

## Agent routing

- Place new SQL in a fresh migration and keep related schema, policies, and functions together when they are interdependent.
- When a server action already encapsulates a write path, extend it instead of adding another direct client write.
- Prefer updating cloud helpers under `frontend/lib/data/cloud/` over introducing new data access layers.
- Verify RLS intent matches the UI flow before wiring new data into stores.
