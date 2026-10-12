# Meal Prep Helper

Plan a week of meals by region, flavor and the time you have, based on what's in your pantry.
Runs on Mac, iPhone and iPad as an installable web app (PWA).

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4, dnd-kit (drag and drop),
Dexie (IndexedDB, local-first and offline), vite-plugin-pwa.

## Run it on your Mac

You need Node.js 20 or newer (https://nodejs.org, or `brew install node`).

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

Everything is stored in the browser on each device (IndexedDB). Devices do not sync yet.
Next step for sync: add Supabase and mirror the three tables in `src/lib/db.ts`.

## Project layout

```
src/
  lib/types.ts         data types, regions, flavors, categories
  lib/db.ts            Dexie database (pantry, recipes, plan)
  lib/seed.ts          starter recipes and pantry
  lib/match.ts         pantry-to-ingredient matching
  lib/dates.ts         week helpers
  components/Planner.tsx, DayCard.tsx, RecipeLibrary.tsx, RecipeCard.tsx, ShoppingList.tsx, Pantry.tsx
```
