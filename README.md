# Kasi Grid

Community resilience for South African townships: live loadshedding status, resident-confirmed outage reports, a neighbourhood sharing board, food access, and savings and business-resilience calculators.

## Run it

```
npm install
npm run dev      # API on :3000 and Vite on :5173, open http://localhost:5173
```

Production:

```
npm run build
npm start        # serves the built app and the API on :3000 (PORT to change)
```

Docker: `docker build -t kasi-grid . && docker run -p 3000:3000 -v kasi-data:/app/data kasi-grid`

## Tests

```
npm test    # 56 tests: calculations, translations, and the full API including admin and rate limits (starts its own server and temporary database)
```

## Outage Pulse

When 3 or more different devices report or confirm the same power or water problem in one suburb within 6 hours, the Today tab shows a **verified outage** card (`GET /api/pulse`). Neighbours can vote "It is back on for me"; once half of them (minimum 2) agree, the card turns green. People can opt in to a phone notification when a new verified outage appears while the app is open. Sample data is ignored. For a demo, run `node scripts/demo-seed.mjs http://localhost:3000 alex` to create one.

## Moderation (admin page)

Open `/admin` and sign in with the server's `ADMIN_TOKEN`. It lists reports, board posts and community places, with flagged items first. You can hide, restore or delete each one, and see how many flags it has and a short id of the device that posted it.

- Set `ADMIN_TOKEN` to a long random value in production. If it is not set, the admin page is disabled in production.
- Outside production, a random token is generated on each start and printed in the server log.
- The page is not linked from the app, and admin responses are never cached by the service worker.

## Languages

English, isiZulu, Sesotho and Afrikaans, chosen from the header (the browser language is used the first time). **The isiZulu, Sesotho and Afrikaans texts are drafts that have not been reviewed by native speakers**, and the language menu says so. Have fluent speakers check `src/locales.js` before a public launch. Coverage: the header, Today tab, alerts, board, checklist and headings in every tab. Long explanatory paragraphs on the Save, Business and Food tabs are still English. Anything missing falls back to English.

## Installable and offline

The production build is a PWA. On a phone, use the browser's "Add to home screen". After the first visit the app opens without signal and shows the last reports and board posts it saw. New reports and board posts made without signal are saved on the phone and sent automatically when it returns (a banner shows how many are waiting). Confirming, flagging and price updates still need a connection. Offline support only runs in the production build (`npm run build && npm start`), not in `npm run dev`.

## How it works

- **Frontend:** React + Vite in `src/`. Savings and business inputs stay in the browser (local storage). Everything shared comes from the API.
- **Backend:** Express in `server/`. It stores reports, board posts, community places and prices in SQLite (libSQL) at `data/kasi.db`.
- **Live data:** the server fetches the loadshedding stage from Eskom (cached 5 minutes) and shops and food outlets from OpenStreetMap (cached 24 hours per suburb, with a fallback mirror).
- **Identity:** anonymous. Each browser gets a random device id, which limits confirmations to one per device and lets authors close their own posts. There are no accounts.
- **Safety:** input length limits, no links or phone/ID numbers in posts, per-IP rate limits (300 reads and 30 writes a minute), and items are hidden after 3 reports from different devices.

## Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 3000) |
| `ADMIN_TOKEN` | Enables the `/admin` moderation page |
| `WRITE_LIMIT` | Writes per minute per IP (default 30) |
| `ADMIN_LIMIT` | Admin requests per minute per IP (default 60) |
| `ESP_AUTOLINK` | `off` stops the background linking of suburbs to EskomSePush areas |
| `ESP_TOKEN` (or a `.env` file) | EskomSePush API key. Enables official loadshedding time slots (see below) |
| `ESP_BASE_URL` | EskomSePush API base URL (default the 3.1 API) |
| `ESP_DAILY_LIMIT` | Calls per day the server allows itself (default 45, under the free 50) |
| `NAMC_AUTO` | Set to `off` to stop the daily NAMC food-price check |
| `DATABASE_URL` | libSQL/Turso URL for a hosted database. Default is the local file `data/kasi.db` |
| `DATABASE_AUTH_TOKEN` | Token for a hosted database |

Hosts with an ephemeral disk (most free tiers) lose `data/` on redeploy. Use a persistent volume or a hosted `DATABASE_URL`.

## Official loadshedding schedules (EskomSePush)

The app can show real time slots from the EskomSePush Business API 3.1 (the older 2.0 API has been retired). Get a token through the [EskomSePush API page on Gumroad](https://eskomsepush.gumroad.com/l/api) (the Personal plan gives 50 credits a day) and put it in a git-ignored `.env` file next to `package.json`:

```
ESP_TOKEN=your-token
```

The server also links unlinked suburbs by itself in the background (shortly after start, then every six hours), a few at a time so credits stay in reserve for schedules; the admin button does the same on demand. Open `/admin` and press **Test connection** to check the token. That links each township to the nearest EskomSePush area by GPS (one credit each). Townships are split into many areas (Ntuzuma A to G, for example) and neighbouring parts can be on different blocks, so the app always names the area it is using and tells people to check their exact one. Use the search box to link a different area if the nearest one is wrong.

**Choosing your own block.** On the Alerts tab, "Not your block? Change area" lets a person pick the area that matches their street from the ESP areas around their township (cached for a week, one credit per township) or search by name (cached, and capped at 8 credits a day across all visitors so schedules always have room). The choice is kept on the phone. The server only accepts areas the API has already returned, so nobody can spend credits on made-up ids, and it falls back to the township's own area if the chosen one cannot be loaded.

**Cape Town's own stage.** Cape Town sets its own stage, which can differ from Eskom's. When ESP is switched on, Cape Town suburbs follow the stage from ESP's `status` (cached for an hour, skipped when credits run low), and the header says "Live from Cape Town". Without it they follow Eskom's stage and the app says that Cape Town's may differ.

Credits are spent carefully: an area's schedule id is cached for a week and schedules are cached per schedule id for 12 hours (many suburbs share one block), and the app stops at `ESP_DAILY_LIMIT` (default 45). Suburbs without a link keep the illustrative pattern, labelled as such. The token stays on the server and is never sent to the browser.

## Food prices update themselves

Once a day the server reads the NAMC listing page, finds the newest Food Basket Price Monthly PDF, extracts Table 2 and imports it **only if** every item and pack size is recognised, the 28 prices add up to the printed total, and no price jumped more than 40%. Otherwise the previous data stays and the reason appears on the admin page, which also has a "Check for a new report" button. Verified against the live NAMC site: it downloaded and parsed the real August 2026 report.

## Cities and tariffs

Forty-nine townships in 22 municipalities across all nine provinces. The six metros with the most detail are Johannesburg, Tshwane, Ekurhuleni, Cape Town, eThekwini (Durban) and Nelson Mandela Bay (Gqeberha); the rest (Emfuleni, Mogale City, George, Stellenbosch, Drakenstein, Msunduzi, Newcastle, Buffalo City, Mangaung, Rustenburg, Matlosana, Polokwane, Thulamela, Mbombela, Emalahleni and Sol Plaatje) have a township or two each. Weather, OpenStreetMap places, food prices and EskomSePush schedules work anywhere. Tariffs for the 16 newer municipalities are marked "not added yet" and link to the municipality website; the calculator asks for the household's own rate. To add a township, add it to `shared/suburbs.js` (coordinates from OpenStreetMap) and its municipality to `CITIES` and `TARIFFS`. Each metro's tariffs live in `shared/tariffs.js` with a status: from a secondary source, estimate, proposed, percentage only, or not available. Water bands: **Johannesburg** (secondary source), **Cape Town** (one aggregator citing the City budget; the annexure itself could not be opened), and **Ekurhuleni, Tshwane and Nelson Mandela Bay as estimates**, meaning the municipality's own published 2025/26 rates (read from the official tariff PDFs) raised by the announced 2026/27 percentage. **eThekwini** has no water bands we could read (its official tariff book is a scanned image), so the calculator asks for the household's own rand-per-kL rate instead of guessing. Electricity blocks are shown where found (Johannesburg, Tshwane, Ekurhuleni, Nelson Mandela Bay). To add a city, fill its `bands` and set the status; the calculator uses them automatically. All figures come from news and tariff-summary sites, not the municipal tariff books, so check them.

## Weather advice

When the forecast crosses a threshold (heavy rain, heat, frost, strong wind) the Today tab shows practical advice, and for rain and wind a one-tap button that opens the report form pre-filled ("Flooding at ...", "Fallen tree or power line at ...").

## Data sources and caveats

| Data | Source | Notes |
|---|---|---|
| Loadshedding stage | Eskom `LoadShedding/GetStatus` | Unofficial endpoint, no key. Cached 5 minutes. |
| Shops, food banks, clinics, hospitals, water points, taxi ranks and stations | OpenStreetMap via Overpass | Cached 24 hours per suburb. Township coverage is patchy (public water points are rare), so residents can add places. |
| Weather forecast and alerts | [Open-Meteo](https://open-meteo.com/) | Free for non-commercial use with attribution (CC BY 4.0). A commercial product needs their paid plan. Cached 1 hour. |
| Weather alerts | Our own thresholds in `server/weather.js` | Heavy rain 15/30 mm, heat 34/38 C, cold 3/0 C, gusts 50/70 km/h (watch/warning). **Not official SAWS warnings**, and the app links to SAWS. There is no free public SAWS feed. |
| National food prices | NAMC Food Basket Price Monthly (Stats SA data). `shared/namc.js` holds the bundled July 2026 snapshot; the server replaces it automatically with newer reports | See "Food prices update themselves". |
| Shop-level prices | Residents | No open dataset exists. |
| Municipal tariffs | `shared/tariffs.js`, from news and tariff-summary sites | See "Cities and tariffs". Verify against each municipal tariff book. |
| Water outages | Residents | There is no public water-outage feed. |
| Simulated schedule | Illustrative pattern | Not an official schedule. |

Rows marked Sample are seed data and are made up.

Loadshedding: Eskom's national stage applies to Eskom-supplied areas. The City of Cape Town runs its own schedule for its customers, so check the City's app there.

## Not done yet

Accounts and phone verification, push notifications, native review of translations and translating the long help texts, official 2026/27 water tariffs (eThekwini has none yet; the rest are estimates or single-source), banning repeat abusers by device.
