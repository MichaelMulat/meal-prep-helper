# Meal Prep Helper

Plan a week of meals by region, flavor and the time you have, based on what's in your pantry.
Runs on Mac, iPhone and iPad as an installable web app (PWA).

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4, dnd-kit (drag and drop),
Dexie (IndexedDB, local-first and offline), Supabase (sign-in and sync), vite-plugin-pwa.

## Run it on your Mac

You need Node.js 20.19+ or 22.12+ (https://nodejs.org, or `brew install node`).

```bash
cd "~/Documents/Claude/Projects/Home Meal Prep helper"
npm install
npm run dev
```

Open http://localhost:5173.

To try it on your iPhone or iPad while developing, keep `npm run dev` running and open the
"Network" address it prints (e.g. http://192.168.1.20:5173) in Safari on the same Wi-Fi.

## Install it as an app

Offline support and "install" need HTTPS, so deploy it (free) to Vercel or Netlify:
`npm run build` produces the `dist/` folder, or connect the repo to Vercel and it builds automatically.

- **iPhone / iPad:** open the site in Safari, Share, then Add to Home Screen.
- **Mac:** open it in Safari, then File, Add to Dock.

## What's here

- **Week plan:** drag recipes onto breakfast, lunch and dinner slots (or tap a recipe, then tap a slot).
  Drag planned meals to move or swap them. Filter by region, flavor and time available.
  "Auto-fill empty slots" picks from your filtered recipes, favoring what you already have.
- **Pantry match:** every recipe shows how many of its ingredients you have on hand.
- **Shopping list:** what this week's plan needs that's missing from your pantry. Tick an item to add it to the pantry.
- **Pantry:** items grouped by category, quantities, and use-by dates with "expiring soon" flags.

## Where data lives

Everything is stored in the browser on each device (IndexedDB), so the app works offline.
Sign in (the dot button in the header) to sync pantry, recipes and plan across devices through Supabase.
Without `.env.local`, the app runs local-only and the sign-in button is hidden.

### Supabase setup (once)

1. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key
   (Supabase dashboard, Project Settings, API). Restart `npm run dev` after editing it.
2. In the dashboard's SQL Editor, run `supabase/schema.sql` (tables, row-level security, realtime).
3. Authentication, URL Configuration: set the Site URL to where the app is deployed and add
   `http://localhost:5173` (plus any LAN address you test from) to Redirect URLs.
4. Google sign-in: in Google Cloud Console, create an OAuth client ID (type "Web application") with
   the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste its client ID
   and secret into Supabase, Authentication, Sign In / Providers, Google, and enable it.
5. Email code (fallback): Authentication, Emails, Magic Link template: add `{{ .Token }}` so the email
   includes a code. Typing the code works in the installed iPhone app, where links open in Safari instead.

How sync works: each local write is queued in an outbox table and pushed to Supabase; changes from
other devices are pulled by `updated_at` (on launch, focus, every minute and via realtime).
Deletes are soft (`deleted = true`) so they reach other devices. The last write to reach the server wins.

## Project layout

```
src/
  lib/types.ts         data types, regions, flavors, categories
  lib/db.ts            Dexie database (pantry, recipes, plan) and the sync outbox
  lib/sync.ts          two-way sync with Supabase
  lib/supabase.ts      Supabase client (reads .env.local)
  lib/seed.ts          starter recipes and pantry
  lib/match.ts         pantry-to-ingredient matching
  lib/dates.ts         week helpers
  components/Planner.tsx, DayCard.tsx, RecipeLibrary.tsx, RecipeCard.tsx, ShoppingList.tsx, Pantry.tsx, SyncButton.tsx
supabase/schema.sql    database schema to run in Supabase
```
