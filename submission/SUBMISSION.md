# Kasi Grid: submission drafts

Fill the `[BRACKETS]` before submitting. Copy the sections below into Sonke.

## Checklist
- [ ] Optional if time allows: run the pilot (`PILOT.md`) and add real numbers and quotes to slide 11 of the deck
- [ ] Send the outreach messages (`submission/OUTREACH.md`): equipment supplier, bank contact, spaza owner
- [ ] Deck: `Kasi-Grid-deck.pptx` (14 slides). Open it and check every slide. Fill team name, URL, admin token, video link, Mulanga's part. Export to PDF
- [ ] Demo video, 90 seconds or less (script below)
- [ ] SSDLC form (below)
- [ ] Lean Business Canvas (below)
- [ ] Judge-facing app URL deployed with `DEMO_MODE=true` (see DEPLOY.md), so it always opens with verified outages, a forecast and a typical duration. Open it on a phone before submitting. Use a separate deployment with `DEMO_MODE` off for any real pilot
- [ ] Native-speaker check of isiZulu, Sesotho and Afrikaans (`src/locales.js`)

## Track
Climate resilience and essential services: "How might communities use data and digital services to prepare for disruptions, reduce household costs and improve access to water, energy, transport and food?"

## Background: what inspired this project?
> Loadshedding is over in South Africa, but the outages aren't. Eskom has reported more than 500 days without it, yet in the townships the power still cuts out because of load reduction, cable theft and substation faults. In Johannesburg, the water fails too: 22 major outages in two weeks of January 2026 alone. When this happens there is no stage or schedule to check. People turn to rumours in WhatsApp groups, while families and spaza shops lose food, stock and income waiting to learn what is real.
>
> We are Tshedza Tshikovhi and Mulanga Munaka, both 22. Tshedza is a software developer who leads a small team at Shudu Connections in The Innovation Hub, building an SME incubation platform. He also built CashCram, a Top-13 finalist in NWU's 2026 Pitch Your Business Competition. Mulanga is a biomedical engineering student at Wits, and her training in designing for real people in high-stakes settings shaped how we built this. [Add what Mulanga did on the project.]
>
> Our idea is simple: the people living in a neighbourhood already know what is failing in it. Kasi Grid turns their reports into verified, suburb-level alerts, and an outage counts as verified only when three different devices agree. It learns when outages happen and how long they last. For a household that depends on power for oxygen or other medical devices, it shows how long a battery lasts against a typical outage and helps book a backup or a carer. It is anonymous and works offline, because signal drops exactly when the power does.

Facts: Eskom load-reduction and loadshedding figures are from Eskom statements (Oct 2026); water figures are from news reports (Daily Maverick, allAfrica).

## What is new in this version (hackathon feature)
**Verified outages on a map** (3+ different devices, "back on" voting, opt-in notifications). **Outage forecast** (weekday and time-of-day pattern, early warning) and **typical duration** learned from "back on" votes, with an "expected back around" time. **Medical power plan** (device watts and battery watt-hours against the typical outage, a proactive warning before the high-risk window, a link to book a backup). **Care booking** modelled on SweepSouth (fixed price, nearest carers asked, first to accept, prescription gate for oxygen). **Outage cost** for small businesses, live during an outage. See README, DEPLOY.md and PILOT.md.

## 90-second demo script
Use the `DEMO_MODE=true` instance. Mulanga speaks for the Care part.

| Time | On screen | Say |
|---|---|---|
| 0:00-0:10 | Title slide, then the app on Today | "Loadshedding is over. But in kasi the power and water still go off, and nobody knows what is real. This is Kasi Grid." (Tshedza) |
| 0:10-0:25 | Today: verified outage card and the map | "Three different neighbours reported no power, so it is a verified outage, not a rumour. It shows on the map, and the app says it is usually back around 16:30, because it has learned how long cuts last here." |
| 0:25-0:40 | Forecast card | "It also learns the pattern. Power cuts here are most likely Thursday evening. That is not a black box: it shows its confidence and says when it does not have enough data." |
| 0:40-1:00 | Care tab: type 300 W and 1000 Wh | "Now, Gogo uses an oxygen concentrator. Her family enters the device and the battery. 2.8 hours. The app compares that with how long outages usually last here, and tells them it is not enough." (Mulanga) |
| 1:00-1:15 | Tap "Get a battery backup", show the price and the booking | "One tap books a backup. The price is fixed, the three nearest carers or the supplier are asked, and oxygen needs a prescription approved first. Everything medical stays on her phone." (Mulanga) |
| 1:15-1:25 | Business tab: "outage costing you now" | "For a spaza owner, the app shows what this outage has cost so far, in lost sales and stock at risk, and what would stop it. That is where a bank can help." (Tshedza) |
| 1:25-1:30 | Switch language to isiZulu | "Four languages, offline, free for residents. Kasi Grid." |

## SSDLC (draft answers)
| Phase | What we did |
|---|---|
| Requirements | Threats considered up front: spam and fake reports, privacy of residents and of health information, abuse of the share board, scraping and DoS of the API. Decision: anonymous design, no personal data collected, the medical power plan never leaves the phone. |
| Design | Thin client, validating API, parameterised SQL. Roles: anonymous device, admin (token). Trust model: an outage is only "verified" when 3+ distinct devices agree. Prices for care bookings are set on the server, never by the client. |
| Development | Input validation on every write (length, type allow-lists, no links, no phone or ID numbers). Per-IP rate limits. Timing-safe admin token check. Security headers (nosniff, frame deny, referrer policy). Care bookings are private to a device and are never cached by the service worker. Secrets via environment variables, never committed. |
| Testing | 99 automated tests: calculations, translations, the full API including admin, care bookings and rate limits, and the outage rules. Run with `npm test`. We also checked the production build in a real browser. |
| Deployment | Dockerfile with persistent volume. Admin page disabled in production unless `ADMIN_TOKEN` is set. HTTPS terminated by the host. |
| Maintenance | Community flagging auto-hides content after 3 flags. Admin moderation page. Dependencies pinned by lockfile. **Gaps to state honestly:** no automated dependency scanning or pen test yet; carers, equipment prices and payments in the Care tab are placeholders; POPIA review is needed before real health or booking data is handled. |

## Lean Business Canvas (draft)
- **Problem:** (1) Loadshedding has been off since May 2025 (Eskom), but local outages have not stopped: load reduction in townships (about 202,000 Eskom customers, 2.8%), cable theft, substation faults, and Johannesburg water failures (22 major outages in two weeks of January 2026). Nobody publishes street-level, verified information for these. (2) Households that depend on power for medical devices cannot tell if their backup will last. (3) Township businesses lose stock and sales and cannot see what an outage costs.
- **Customer segments:** Township residents (users, free). Households with medical power needs and the carers and suppliers that serve them. Spaza and micro-businesses (Pro). Municipalities and utilities (data buyers). Banks, insurers and NGOs (sponsors, partners).
- **Unique value proposition:** The only app that turns neighbour reports into verified, suburb-level outage alerts, learns how long they last, and connects that to medical power needs, care booking and what an outage costs a business, in four languages, offline.
- **Solution:** Verified outage map and pulse, forecast and duration estimate, medical power plan, care and equipment booking, outage-cost planner, share board, nearby places and food prices, savings calculators.
- **Channels:** WhatsApp sharing from the app, community WhatsApp groups, ward councillors, spaza associations, clinics and home-care suppliers, bank partnerships, installable PWA (no app store needed).
- **Revenue streams:** Commission on care bookings. Partner fees from licensed equipment suppliers. Spaza Pro subscription (about R29 per month, to test). Municipal and utility dashboard and API licence. Sponsored resilience content or products from banks and insurers.
- **Cost structure:** Hosting and database (low), API keys (EskomSePush), translation review, community moderators, carer vetting through a partner, payment fees, data costs for outreach.
- **Key metrics:** Weekly active suburbs. Reports verified. Median time from first report to verification. Accuracy of the duration estimate. Care bookings filled. Share-board offers fulfilled. Pro conversions.
- **Unfair advantage:** Community-generated, device-verified outage data per suburb that does not exist elsewhere. Trust built in township networks. A biomedical-engineering perspective on power dependence. Data we own and can export.
- **Assumptions to validate (hypotheses, not results):** Pricing for spaza owners. Municipal willingness to buy. Whether suppliers and carers will partner. Whether a bank would offer an outage product.
