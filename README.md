# Barnabas — Bible Reading Encouragement System

A companion app for AJaytheCEO's [Read the Bible in One Year](https://www.youtube.com/playlist?list=PLfNVqWlknkohmH-Jszcwtanlr703lxoR5)
chronological plan. Sign in, mark each day complete as you watch, and never
lose your place. If life gets in the way, the app tells you exactly where you
are and how many days you need to catch up — and you can spend a few "grace
days" if you need to slide the schedule.

Named for the apostle Barnabas — *the son of encouragement* (Acts 4:36).

## Features

- Pick your **start date**; the 365-day plan is scheduled from there.
- See **today's reading** with the YouTube video embedded.
- **Catch-up indicator** when you fall behind, with a grace-day budget you can
  spend instead of doubling up.
- **Streaks & milestones**: 7/30/100-day streaks, book completions, halfway,
  finish.
- **Groups** with invite codes: encourage your media group together.
- **Daily email nudges** at a time you pick.
- **Auto-detects new videos** as AJay publishes them (he's mid-series).
- Sign in with **Google, GitHub, Microsoft, or email magic-link**.

## Tech

Next.js 15 + Tailwind on Vercel, Supabase (Postgres + Auth) with RLS, Resend
for email, YouTube Data API v3 for playlist sync. See [CLAUDE.md](./CLAUDE.md)
for full architecture, schema, and setup instructions.

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in keys
# Apply supabase/migrations/0001_initial_schema.sql in your Supabase project
npm run seed:readings           # load the 365-day plan
npm run sync:playlist           # backfill AJay's published videos
npm run dev
```

Full setup walkthrough is in [CLAUDE.md](./CLAUDE.md).
