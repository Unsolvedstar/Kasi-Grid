# Kasi Grid: submission drafts

Fill the `[BRACKETS]` before submitting. Copy the sections below into Sonke.

## Checklist
- [ ] Deck: `Kasi-Grid-deck.pptx` (10 slides). Export to PDF from PowerPoint. Fill team name, URL, admin token, video link (slides 1 and 10)
- [ ] Demo video, 90 seconds or less (script below)
- [ ] SSDLC form (below)
- [ ] Lean Business Canvas (below)
- [ ] Deployed app URL reachable, seeded with `node scripts/demo-seed.mjs <url> alex`

## Hackathon feature (required for existing apps)
**Outage Pulse**: verified outage detection from 3+ independent device reports, "back on" voting, opt-in notifications. See README.

## 90-second demo script
| Time | On screen | Say |
|---|---|---|
| 0:00-0:10 | Today tab, Alexandra | "When the grid fails in kasi, nobody knows what is real. Kasi Grid fixes that." |
| 0:10-0:30 | Verified outage card | "New this weekend: Outage Pulse. Three different neighbours reported no power, so it is verified, not a rumour." |
| 0:30-0:45 | Tap "It is back on for me" | "When power returns, neighbours vote. Half agree and the alert closes." |
| 0:45-1:00 | Alerts, file a report; airplane mode | "Reports work offline. They queue and send when signal returns." |
| 1:00-1:15 | Share board, Nearby food prices | "Neighbours offer charging and water, and report food prices so families spend less." |
| 1:15-1:30 | Switch language to isiZulu | "Four languages, installable, anonymous, free for residents. Kasi Grid: prepare, save, share." |

## SSDLC (draft answers)
| Phase | What we did |
|---|---|
| Requirements | Threats considered up front: spam and fake reports, privacy of residents, abuse of the share board, scraping and DoS of the API. Decision: anonymous design, no personal data collected. |
| Design | Thin client, validating API, parameterised SQL. Roles: anonymous device, admin (token). Trust model: an outage is only "verified" when 3+ distinct devices agree. |
| Development | Input validation on every write (length, type allow-lists, no links, no phone or ID numbers). Per-IP rate limits. Timing-safe admin token check. Security headers (nosniff, frame deny, referrer policy). Secrets via environment variables, never committed. |
| Testing | 64 automated tests: calculations, translations, full API including admin, rate limits and the Outage Pulse rules. Run with `npm test`. |
| Deployment | Dockerfile with persistent volume. Admin page disabled in production unless `ADMIN_TOKEN` is set. HTTPS terminated by the host. |
| Maintenance | Community flagging auto-hides content after 3 flags. Admin moderation page. Dependencies pinned by lockfile. **Gap to state honestly:** no automated dependency scanning or pen test yet. |

## Lean Business Canvas (draft)
- **Problem:** (1) Outage information is generic and unverified. (2) Township businesses lose money and stock to outages. (3) Households cannot see food prices or find help nearby.
- **Customer segments:** Township residents (users, free). Spaza and micro-businesses (Pro). Municipalities and utilities (data buyers). Banks, insurers and NGOs (sponsors).
- **Unique value proposition:** The only app that turns neighbour reports into verified, suburb-level outage alerts, with local help and prices, in four languages, offline.
- **Solution:** Verified outage pulse, live loadshedding and official slots, share board, nearby places and food prices, savings and business calculators.
- **Channels:** WhatsApp sharing from the app, community WhatsApp groups, ward councillors, spaza associations, bank partnerships, installable PWA (no app store needed).
- **Revenue streams:** Spaza Pro subscription (about R29 per month). Municipal and utility dashboard and API licence. Sponsored resilience content from banks and insurers.
- **Cost structure:** Hosting and database (low, SQLite or Turso), API keys (EskomSePush), translation review, community moderators, data costs for outreach.
- **Key metrics:** Weekly active suburbs. Reports verified. Median time from first report to verification. Share-board offers fulfilled. Pro conversions.
- **Unfair advantage:** Community-generated, device-verified outage data per suburb that does not exist elsewhere. Trust built in township networks. Data we own and can export.
- **Assumptions to validate:** Pricing for spaza owners. Municipal willingness to buy. These are hypotheses, not measured results.
