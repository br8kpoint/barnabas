# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Barnabas** is a multi-user web app that tracks progress through AJaytheCEO's
*Read the Bible in One Year* YouTube series (playlist
`PLfNVqWlknkohmH-Jszcwtanlr703lxoR5`). The chronological plan is 365 days; AJay
publishes roughly one video per day and is mid-series, so the videos table fills
in over time. Users mark each day complete; the app surfaces where they are,
how far behind they are, and helps them catch up.

Named for Barnabas, "son of encouragement" (Acts 4:36).

## Stack & hosting

- **Next.js 15** (App Router, React 19, TypeScript, Tailwind) on **Vercel**
- **Supabase** for Postgres + Auth (Google, GitHub, Microsoft (`azure`), and
  email magic-link). The browser uses the anon key + RLS; server routes use
  the SSR client; cron and seed scripts use the service-role key.
- **Resend** for transactional email (daily reminders + new-video notices).
- **YouTube Data API v3** for playlist sync.
- **Vercel Cron** for two recurring jobs (see `vercel.json`).

## Daily commands

```bash
npm install
cp .env.example .env.local        # then fill in keys (see Env section below)
npm run dev                       # http://localhost:3000
npm run typecheck                 # tsc --noEmit
npm run lint                      # next lint
npm run seed:readings             # upsert data/readings.json into the DB (one-off)
npm run sync:playlist             # backfill / refresh video_ids from YouTube (one-off)
```

## Initial setup (do this once)

1. Create a Supabase project. In the SQL editor, run
   `supabase/migrations/0001_initial_schema.sql`.
2. Grab your API keys from Supabase. As of 2026, anon/service_role live under
   **Project Settings -> API Keys -> Legacy**
   (`https://supabase.com/dashboard/project/<ref>/settings/api-keys/legacy`),
   NOT the older Settings -> API page. The Project URL is on the same page.
3. In Supabase **Authentication -> Providers**, enable Google, GitHub, Azure
   (= Microsoft), and Email (magic link). Set the redirect URL to
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`
   for dev).
4. Get a YouTube Data API v3 key from Google Cloud Console.
5. Get a Resend API key + verify your sending domain.
6. Fill in `.env.local` from `.env.example`. Generate `CRON_SECRET` with
   `openssl rand -hex 32`.
7. `npm run seed:readings` — loads the 365-day plan.
8. `npm run sync:playlist` — backfills `video_id` for every Day N AJay has
   already published.
9. `npm run dev` and sign in.

## Architecture at a glance

```
data/readings.json          ── 365-day plan from the PDF (passage strings only)
                                   │
                                   ▼
supabase: public.readings   ── day | passage | video_id | video_published_at
                                   ▲
                       sync cron ──┘  (YouTube Data API v3, every 6h)
                                   │
                                   ▼  (when video_first_seen_at flips, notify)

auth.users → public.user_profiles (1:1, created by trigger on signup)
              └── timezone, start_date, grace_days_used/budget, reminder_hour

public.progress (user_id, day)         — append-only marker of completed days
public.groups + public.group_members   — invite-code-joined visibility scope
public.reminder_log                    — idempotency for the reminder cron
```

### The catch-up calculation (`src/lib/schedule.ts`)

This is the heart of the system; everything in the dashboard derives from it.

```
scheduled_day      = days_since(start_date) + 1            [in user's tz]
effective_day      = scheduled_day − grace_days_used       [capped at 365]
last_completed     = max(day in progress) or 0
next_day           = last_completed + 1
behind_by          = max(0, effective_day − last_completed − 1)
on_track           = behind_by == 0
```

"Grace days" are a budget the user spends to slide the calendar forward
(e.g. for vacations) instead of marking readings done. They never go negative,
and they're capped by `grace_days_budget`.

### The reading-window display

The dashboard shows three reading cards — `nextDay`, `nextDay+1`, `nextDay+2`.
This lets a user who's caught up see "today + tomorrow + the next" at a glance,
and a user who's behind see the next three to clear. Marking complete refreshes
the page and shifts the window forward.

### YouTube sync (`src/lib/sync.ts`, `src/lib/youtube.ts`)

- Calls `playlistItems.list` (50 per page, multiple pages).
- Parses `Day N` out of each video title with `/\bDay\s+(\d{1,3})\b/i`.
- Upserts `(day, video_id, video_title, video_published_at)`. The first time
  we ever see a video for a given day, we also stamp `video_first_seen_at`
  and trigger the "newly available" notification fan-out.
- Idempotent: re-running just updates rows with the latest title/publishedAt.

If AJay ever changes his title format, the regex is the only change point.

### Email notifications (`src/lib/notifications.ts`)

Two flavors, both routed through Resend:

1. **Daily reminders** — cron runs every 15 minutes. For each opted-in user
   whose `reminder_hour` matches the current hour in their `timezone` and
   whose next reading isn't done, we send the nudge and stamp `reminder_log`
   with `(user_id, scheduledDay)` so we don't re-send.
2. **Newly-available** — fired right after a playlist sync, only to users
   whose `nextDay` is one of the days that just became available. Idempotency
   uses `reminder_log` with a *negative* day key (`-day`) so it doesn't
   collide with daily-reminder rows.

### Row Level Security

All user-scoped tables have RLS. The non-obvious policy is
`progress.progress self-read`: users see their own progress *and* their
groupmates' progress (via the existence subquery over `group_members`). This
is what lets the group view work without exposing arbitrary other users.

The `user_progress_summary` view is the public-facing projection used by the
group leaderboard — it deliberately omits timezone and email.

## Maintenance & gotchas

- **Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS.** It's only
  imported by `src/lib/supabase/admin.ts` — which itself is only used from
  `src/lib/sync.ts`, `src/lib/notifications.ts`, and the `scripts/` files.
  Never import `admin.ts` from a client component or page.
- **Cron auth** is a shared `Bearer ${CRON_SECRET}` header that Vercel Cron
  attaches automatically. Both `/api/cron/*` routes check it.
- **OAuth redirect URLs** must be registered in each provider's developer
  console (Google Cloud, GitHub OAuth Apps, Azure App Registration) AND in
  Supabase's Auth → URL Configuration → Redirect URLs.
- **Books in passages** like `"Genesis 11; Job 1-2"` are split on `;`. The
  helper `booksInPassage` in `src/lib/readings.ts` strips the chapter range,
  which is used to credit book-completion milestones.
- **Streak math** is plan-day continuity, not calendar continuity. A weekend
  catch-up that reads Day 143, 144, 145 still has a streak of 3+.

## Adding features — useful entry points

| You want to…                       | Start here                                              |
|------------------------------------|----------------------------------------------------------|
| Add a new milestone type           | `src/lib/milestones.ts`                                  |
| Change catch-up math               | `src/lib/schedule.ts` (tests live in your head; consider adding `vitest`) |
| Add a new sign-in provider         | Enable in Supabase dashboard, then `src/components/SignInPanel.tsx` |
| Change reminder timing             | `vercel.json` schedule + `sendDueReminders` in `src/lib/notifications.ts` |
| Add per-day notes/reflection       | New table + RLS; surface from `TodayCard.tsx`            |
| Replace the YouTube source         | `src/lib/youtube.ts` + the regex in `parseDayFromTitle`  |

## File map — what lives where

```
data/readings.json                       365-day plan (seeded from the PDF)
supabase/migrations/0001_initial_schema.sql
src/middleware.ts                        session refresh + auth gating
src/app/page.tsx                         marketing landing
src/app/login/page.tsx                   sign-in
src/app/auth/callback/route.ts           OAuth code exchange
src/app/auth/signout/route.ts            sign-out POST
src/app/(app)/layout.tsx                 signed-in chrome (nav header)
src/app/(app)/dashboard/page.tsx         today's reading + catch-up
src/app/(app)/plan/page.tsx              full 365-day list
src/app/(app)/groups/page.tsx            create / join
src/app/(app)/groups/[id]/page.tsx       group progress view
src/app/(app)/settings/page.tsx          timezone, start_date, reminders, grace
src/app/actions.ts                       server actions: mark complete, grace, settings
src/app/group-actions.ts                 server actions: create/join/leave
src/app/api/cron/sync-playlist/route.ts  Vercel cron endpoint
src/app/api/cron/send-reminders/route.ts Vercel cron endpoint
src/lib/schedule.ts                      catch-up math + streaks
src/lib/readings.ts                      readings table helpers + book parsing
src/lib/milestones.ts                    streak/book/halfway/complete
src/lib/sync.ts                          playlist sync orchestration
src/lib/youtube.ts                       YouTube Data API client
src/lib/notifications.ts                 reminders + newly-available emails
src/lib/supabase/{client,server,admin}.ts  Supabase clients (3 contexts)
scripts/seed-readings.ts                 one-off: load readings.json
scripts/sync-playlist.ts                 one-off: backfill from YouTube
```

## Env vars

See `.env.example`. The critical ones:

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | bypasses RLS — keep secret |
| `NEXT_PUBLIC_APP_URL` | OAuth redirect, email links | e.g. https://barnabas.example.com |
| `YOUTUBE_API_KEY` | sync cron + script | YouTube Data API v3 |
| `YOUTUBE_PLAYLIST_ID` | sync cron + script | `PLfNVqWlknkohmH-Jszcwtanlr703lxoR5` |
| `RESEND_API_KEY` | reminder cron | |
| `REMINDER_FROM_EMAIL` | reminder cron | must be a verified Resend sender |
| `CRON_SECRET` | cron endpoints | shared with Vercel Cron header |
