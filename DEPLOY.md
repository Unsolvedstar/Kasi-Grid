# Deploying Kasi Grid

The app is one container: the API and the built frontend are served from the same port, and data lives in SQLite.

## Render (simplest)
1. Push this repo to GitHub.
2. Render dashboard: New, Blueprint, pick the repo. `render.yaml` creates the service, a 1 GB disk and a random `ADMIN_TOKEN`.
3. Open the service URL. Read `ADMIN_TOKEN` under Environment for the `/admin` page.
4. Optional: add `ESP_TOKEN` (EskomSePush) for official time slots.
5. Seed the judges' demo: `node scripts/demo-seed.mjs https://YOUR-URL alex`.

A disk needs a paid plan. For a free tier, set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to a free Turso database instead and remove the `disk` block.

## Vercel
The frontend is served as static files and the API runs as one serverless function (`api/index.js`, configured in `vercel.json`). Vercel has no persistent disk, so the data must live in a hosted database.

1. Create a free Turso database (turso.tech): `turso db create kasi-grid`, then `turso db show kasi-grid --url` and `turso db tokens create kasi-grid`.
2. Vercel dashboard: Add New, Project, import this GitHub repo. The framework is detected (Vite); no build settings to change.
3. Under Settings, Environment Variables, add:
   - `DATABASE_URL`: the Turso URL (`libsql://...`)
   - `DATABASE_AUTH_TOKEN`: the Turso token
   - `ADMIN_TOKEN`: a long random secret, for the `/admin` page
   - optional `ESP_TOKEN` (EskomSePush), and `DEMO_MODE=true` only on a throwaway judge-demo project
4. Deploy. The tables are created on the first request.

Without `DATABASE_URL` the app still starts on a temporary file that is wiped whenever the function restarts, so use that only for a quick look.

Limits on Vercel: nothing runs in the background, so the monthly food-price check and the automatic EskomSePush area linking do not run on their own (use the buttons on `/admin`, or a Vercel Cron job calling them), and the rate limits are per function instance, not global.

## Any Docker host
`docker build -t kasi-grid . && docker run -p 3000:3000 -v kasi-data:/app/data -e ADMIN_TOKEN=choose-a-long-secret kasi-grid`

## Showing the forecast in a demo
The forecast needs history. On a throwaway demo database only: `DATABASE_URL=... node scripts/demo-history.mjs alex`. Never run it on a database with real community data.

## Judge demo instance

Deploy a separate copy with `DEMO_MODE=true` and its own database (and a throwaway `ADMIN_TOKEN`). It opens with verified outages, a forecast and a typical duration, and refreshes the live outages every 30 minutes. Keep the pilot on a different deployment with `DEMO_MODE` unset, because demo rows look like real reports.
