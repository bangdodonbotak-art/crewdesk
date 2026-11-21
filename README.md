# CrewDesk

**Hire an AI crew for one job. It finishes the work, you approve, it ships.**

CrewDesk is a Support Crew for solo SaaS / e-commerce founders: **Triage** (categorise + prioritise P0–P3) → **Reply** (draft from the knowledge base only) → **Escalate** (refund / angry / out-of-KB goes to the founder). Nothing is sent without founder approval.

- **Status:** MVP, local build only. **NOT live, NOT deployed.** No GitHub repo, no Vercel project, no Supabase project yet.
- **Pricing:** Free $0 forever (5 sent replies/day) · Starter $19/mo · Growth $49/mo — **coming soon, waitlist only** (not built in MVP).
- **Stack:** Next.js 16.4.6 + React 19.3.1 + Tailwind CSS 4.3.5 + `@supabase/supabase-js` 2.119.2. Fonts via runtime `<link>` (Fraunces + Space Grotesk). No `next/font/google`.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # verified exit 0 (21 Nov 2026)
```

Copy `.env.example` to `.env.local` for Supabase keys. Without them the app runs on **labelled demo data** — nothing is live.

## What works in this MVP

- Landing (`/`) with the one interactive moment: live inbox simulator (Triage → Reply → Approve, Approve/Reject buttons).
- Dashboard (`/dashboard`): inbox queue P0–P3, Live tab (empty — no real threads yet) + Demo tab (6 labelled demo threads), quota counter.
- Ticket detail (`/inbox/[id]`): timeline, editable draft, Approve/Edit/Reject (demo — no real email sent).
- Knowledge base (`/knowledge`): local CRUD + search (browser state only).
- Settings (`/settings`): plan, quota, inbound address, upgrade-intent recording (demo, no Stripe).
- API (demo only): `POST /api/crew/run`, `POST /api/crew/approve`, `POST /api/inbound`, `POST /api/upgrade-intent`.
- Supabase migration: `supabase/migrations/20261121000000_crewdesk_init.sql` (file only — **not applied anywhere**).

## Blockers (parent / Dony to resolve)

1. **Supabase project not created** — Auth (Google OAuth) + RLS + migration need a new project. Do NOT reuse paused BARFLOW / NexCreator projects.
2. **Gmail restricted scope + Google verification / CASA** — OAuth is scaffolding only; MVP ingestion is inbound forward-to. Verification takes weeks + cost.
3. **No real model wired** — crew engine is a state machine over demo data; free-model ensemble (Numes/Groq/TokenHarbor) is not connected yet.
4. **No GitHub repo / Vercel deploy** — local only. Deployment Protection must be OFF for the demo when parent ships it.
5. **Auth sessions don't persist** — callback uses `@supabase/supabase-js` directly; `@supabase/ssr` is needed for real cookie sessions.

## Rules this build follows

- Blueprint: `~/workspace/goals/perusahaan-ai-virtual-scorpio-boyz-ai-studio/files/blueprint-crewdesk.md` (ensemble-reviewed 21 Nov 2026).
- Prices live only in `lib/site-data.ts`. No fake metrics, testimonials, or revenue claims anywhere. All demo data is labelled DEMO.
- Quota counts per **sent** reply only. Reflection loop max 1x. Auto-approve opt-in, default OFF.
