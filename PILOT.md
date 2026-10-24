# Pilot plan: real traction in one week

Why this matters: the judges score **Product** and **Impact** on whether the app is used and needed. Right now almost everything in the app is sample data. One week of real use, even small, changes the story from "idea" to "evidence".

**Target:** 20 or more real people in one suburb, 1 spaza or small business owner, 1 community group admin, and at least one real verified outage.

## Before you start (30 minutes)
1. Deploy the app (see DEPLOY.md) with a **fresh database**. Never run `demo-seed.mjs` or `demo-history.mjs` on it: they write fake data that counts in `/api/stats`.
2. Set the default area to your pilot suburb.
3. Set `ADMIN_TOKEN` and check you can open `/admin`.
4. Open the app on your own phone, add it to the home screen, and send a test report. Delete it from the admin page afterwards.

## Day by day
| Day | What to do |
|---|---|
| 1 | Send the WhatsApp message below to 2 or 3 groups you are already in (family, church, ward, a student group). Ask 5 people to report once, even "all fine". |
| 2 | Visit or call one spaza or small business owner. Show the Business tab and ask what an outage costs them. Write down what they say. |
| 3 | Post the Today update with the WhatsApp share button. Ask people who confirmed a report to say why they trusted it. |
| 4 | Ask one person who depends on power for health (oxygen, CPAP, insulin) or a carer to try the Care tab. Get a quote. |
| 5 | Ask someone who is not on the app to hear what they think. |
| 6-7 | Count the numbers below. Collect 2 or 3 short quotes. Take a screenshot of a real verified outage if there was one. |

## WhatsApp message (copy and edit)
> Hi all. My partner and I built a free app for our area called Kasi Grid. When the power or water goes off, you report it in 10 seconds, and when 3 neighbours agree it shows as a verified outage on a map. It also learns how long cuts usually last. No sign-up, no phone number. Please try it and report anything that happens this week: [LINK]. Tell us what is confusing.

## Numbers to record at the end
From `/api/stats` (anonymous, last 7 days) and the admin page:
- neighbours who used it (devices)
- reports, and how many were confirmed by a second person
- verified outages (3 or more devices) and how many were closed by "back on" votes
- the median outage length the app learned
- Care tab: how many people tried the medical power plan or a booking quote

Put them on **slide 11** of the deck (the traction slide) and replace every `[N]`. Report only real numbers.

## What to ask people
1. Did you trust the report you saw? Why or why not?
2. Would you have known about it any other way?
3. For a spaza owner: what did the last outage cost you?
4. What would make you open this every day?

Write the answers down in the person's own words. One honest quote is worth more than a feature.

## If few people join
That is still a result. Say so honestly: how many you reached, how many reported, what stopped the rest. A clear lesson and a plan to fix it scores better than inflated numbers.
