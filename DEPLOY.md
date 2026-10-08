# Deploying Kasi Grid

The app is one container: the API and the built frontend are served from the same port, and data lives in SQLite.

## Render (simplest)
1. Push this repo to GitHub.
2. Render dashboard: New, Blueprint, pick the repo. `render.yaml` creates the service, a 1 GB disk and a random `ADMIN_TOKEN`.
3. Open the service URL. Read `ADMIN_TOKEN` under Environment for the `/admin` page.
4. Optional: add `ESP_TOKEN` (EskomSePush) for official time slots.
5. Seed the judges' demo: `node scripts/demo-seed.mjs https://YOUR-URL alex`.

A disk needs a paid plan. For a free tier, set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to a free Turso database instead and remove the `disk` block.

## Any Docker host
`docker build -t kasi-grid . && docker run -p 3000:3000 -v kasi-data:/app/data -e ADMIN_TOKEN=choose-a-long-secret kasi-grid`

## Showing the forecast in a demo
The forecast needs history. On a throwaway demo database only: `DATABASE_URL=... node scripts/demo-history.mjs alex`. Never run it on a database with real community data.
