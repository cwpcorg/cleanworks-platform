# CleanWorks Pro Platform

A working MVP foundation replicating Breezeway's core features for a single
company, built so it can grow into a multi-tenant product later:

- Checkout-triggered scheduling via Airbnb/VRBO iCal sync
- Installable, offline-capable field checklist with photo proof
- Automated recurring report emails to you and the property host
- Dispatch-board dashboard with a distinct visual identity (not a template)

**What this is:** a real, deployable codebase you own outright — not a demo.
**What this isn't yet:** a hardened, fully tested product. Treat it as v0.1 —
solid bones, but you (or I, continuing in Claude Code where I can actually
run and test the app) should expect to keep iterating: error states, auth
edge cases, a nicer properties/checklist-template editor, etc.

## Stack

- **Next.js 14** (App Router) — frontend + API routes in one deploy
- **Supabase** — Postgres database, auth, and photo storage (free tier)
- **Vercel** — hosting + free Cron for the two automations
- **Resend** — transactional email for reports (free tier covers this volume)

Total cost to run today: **$0/month**, scaling to roughly $0–25/month as you
add properties, well under Breezeway's $130/month.

## Setup

### 1. Supabase

1. Create a project at supabase.com (free tier).
2. In the SQL editor, run `supabase/schema.sql` — but first edit the last
   line to use your real email instead of `you@example.com`.
3. Go to Authentication → Users → Add User, create yourself an account with
   the same email.
4. Go to Table Editor → `profiles`, add a row: `id` = your new auth user's
   UUID, `company_id` = the UUID from the `companies` row that got seeded,
   `role` = `owner`.
5. Go to Storage → create a new bucket called `job-photos` (private).
6. Copy your Project URL, anon key, and service role key from
   Settings → API into a local `.env.local` (copy `.env.example` first).

### 2. Resend (for report emails)

1. Sign up at resend.com (free tier: 100 emails/day, 3,000/month).
2. Verify your sending domain (or use their test domain while developing).
3. Copy your API key into `.env.local`.

### 3. Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — add a property, then visit
`/checklist/[the job id]` on your phone to see the field view. Try airplane
mode once it's loaded — the checklist keeps working and syncs when you
reconnect.

### 4. Deploy

1. Push this folder to a GitHub repo.
2. Import it in Vercel, add all the env vars from `.env.local` plus a
   `CRON_SECRET` (any long random string).
3. Vercel will pick up `vercel.json` and run the two cron jobs automatically.
4. Point `app.cleanworksprocleaning.com` (or similar) at the Vercel deploy —
   same DNS process you already did for the main site.

## What's deliberately left for the next pass

- Checklist template editor UI (right now templates/items are added directly
  in Supabase's table editor — functional, not pretty)
- Login page UI (Supabase Auth is wired up; the actual sign-in screen still
  needs building)
- Photo gallery rendering on the job detail page (upload works; display is a
  placeholder)
- Stripe billing, once you're ready to open this up to other businesses

I'd recommend continuing this build in **Claude Code**, where I can install
dependencies, actually run the dev server, and catch bugs before you see
them — this chat interface can write the files but can't execute or test
this app end-to-end.
