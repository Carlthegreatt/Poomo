# Supabase auth setup for Poomo

Apply SQL migrations under `supabase/migrations/` in this repo to your project (for example `supabase db push` or the dashboard SQL editor). The app expects RPCs such as `fetch_kanban_snapshot`; if migrations are missing, the board load will fail until they are applied.

Configure these in the [Supabase Dashboard](https://supabase.com/dashboard) for your project (Authentication → URL configuration).

## Email confirmation (required for this app)

The app expects **password sign-up to return a session immediately**. Turn **Confirm email** **off** for the email provider:

Authentication → Providers → Email → disable **Confirm email** (wording may vary by dashboard version).

If confirmation stays on, sign-up succeeds but there is no session until the user clicks the email link; the login page will show an error pointing you back here.

## Site URL

Set **Site URL** to your production origin (for example `https://your-domain.com`).

## Redirect URLs (allow list)

Password reset uses `resetPasswordForEmail` with `redirectTo` pointing at `/auth/callback?next=/auth/update-password`. Allow:

- `http://localhost:3000/auth/callback` (or your dev port)
- Production: `https://<your-domain>/auth/callback`

Wildcards such as `http://localhost:3000/**` are supported if your dashboard allows glob patterns.

## Email templates (optional)

Align reset-password template copy with your product name. Entry points: `/auth/login` and `/auth/forgot-password`.
