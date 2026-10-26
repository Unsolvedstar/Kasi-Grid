// The single source for everything handed in. `node submission/build.mjs` turns it into SUBMISSION.md and the numbered PDFs in
// submission/handin/. Edit the words here, never in the generated files.
//
// Block types: { p }, { ul: [] }, { table: [header, ...rows] }, { note }, { h3 }.

export const TEAM = 'Amethyst & Azure'
export const APP = 'Kasi Grid'
export const REPO = 'https://github.com/Unsolvedstar/Kasi-Grid'
export const LIVE_URL = 'https://kasi-grid.vercel.app'
export const VIDEO_URL = 'https://drive.google.com/file/d/136fqIx7WRivrNcLZo90X4rfTMUO3MXxv/view?usp=drivesdk'
export const HACK = 'FNB App of the Year Hackathon 2026'
export const TRACK = 'Climate resilience and essential services'
export const TAGLINE = 'Know before it goes dark.'

export const overview = [
  {
    id: 'background', title: 'What inspired this project',
    blocks: [
      { p: 'Loadshedding is over in South Africa, but the outages are not. Eskom has reported more than 500 days without it, yet in the townships the power still cuts out because of load reduction, cable theft and substation faults. In Johannesburg the water fails too: 22 major outages in two weeks of January 2026 alone. When this happens there is no stage or schedule to check. People turn to rumours in WhatsApp groups, while families and spaza shops lose food, stock and income waiting to learn what is real.' },
      { p: 'We are Tshedza Tshikovhi and Mulanga Munaka, both 22. Tshedza is a software developer who leads a small team at Shudu Connections in The Innovation Hub, building an SME incubation platform, and who built CashCram, a Top-13 finalist in NWU\'s 2026 Pitch Your Business Competition. Mulanga is a biomedical engineering student at Wits and was responsible for the medical side of the app: the medical power plan, its battery alerts and the emergency features. Her training in designing for real people in high-stakes settings shaped how they work.' },
      { p: 'Our idea is simple: the people living in a neighbourhood already know what is failing in it. Kasi Grid turns their reports into verified, community-level alerts. An outage counts as verified only when three different devices agree.' },
    ],
  },
  {
    id: 'problem', title: 'Problem statement',
    blocks: [
      { p: 'Loadshedding has officially ended. Eskom reports more than 500 days without it. But in townships and informal settlements, power and water still fail without warning. The causes are load reduction, cable theft and substation faults, and in Johannesburg 22 major water outages hit in just two weeks of January 2026. These failures have no stage and no published schedule, so there is nothing to check. People rely on rumours in WhatsApp groups to learn what is real. The people hurt most are low-income households and spaza shop owners, who lose food, stock and a day\'s income because they find out too late to prepare. Households that depend on power for oxygen concentrators or other medical devices are at the greatest risk, because they cannot tell how long their battery will last against an outage.' },
      { p: 'The pain points are specific. There is no trusted, community-level source of what is failing right now. There is no warning before it happens. Rumour spreads faster than any official notice. And the tools that exist assume a signal and a schedule, but signal drops exactly when the power does. The people living in a neighbourhood already know what is failing in it, but nothing turns that knowledge into something others can act on.' },
      { p: `There is a quieter problem underneath. Digital life has made it easier to scroll past the person next door. In a blackout people learn what is happening on their own street from rumours in a group chat, not from each other, and a household sitting in the dark often has no idea that a neighbour two doors down has a generator, a gas stove or a spare phone charger. The tools meant to connect us have left many communities less connected, exactly when a community is needed most.` },
      { note: 'Sources: Eskom statements and SAnews (October 2026); Daily Maverick (January 2026); allAfrica (August 2026).' },
    ],
  },
  {
    id: 'solution', title: 'Solution and features',
    blocks: [
      { p: 'Kasi Grid is a free web app that works anonymously (an account is optional), installs on a phone and keeps working offline. It turns neighbours\' reports into verified outage alerts for power and water, learns when and how long outages happen, and connects an outage to action: a medical battery countdown, an ambulance call, help from neighbours and what an outage costs a shop. It works for any place in South Africa.' },
      { ul: [
        '**A live satellite street.** The home screen is a real satellite view of the community with every mapped home as a glowing dot. Homes go dark as the risk of a power cut rises. Drag a slider through the next 48 hours and watch the street dim and relight. Tap a home for its status.',
        '**Verified outages.** Three or more different devices reporting the same problem make a verified outage on the map. Neighbours vote "back on for me" and the alert closes itself. Reports are anonymous.',
        '**No account needed, and one if you want it.** Everything works anonymously. An optional free account (cell number or email and a password) keeps your area, language, accessibility settings and bookings on any phone, and signs you in automatically every time the app opens.',
        '**Anywhere in South Africa.** Every place is a community of about 2 km. Find any town, suburb or street, or use your location. Reports and posts can carry an exact pin; neighbours see board posts only to about 100 m so no home is given away.',
        '**Early warning.** The app learns each community\'s own pattern (which weekday and time outages cluster) and how long they last, shows "expected back around 16:30", and says when it does not have enough data.',
        '**Medical power plan.** A household enters its device and battery; the plan counts the real hours, tracks them live against the time on battery (and against readings from the battery display), alerts at 2 hours, 1 hour, 30 minutes and empty, and puts a call to the ambulance one tap away. A text-my-location emergency card works without a voice call.',
        '**Care and equipment booking** in four short steps: fixed price, the nearest carers or runners are asked, a prescription check for oxygen.',
        '**Small business outage cost.** What an outage has cost a shop so far in lost sales and stock at risk, and ranked fixes by payback.',
        '**Help between neighbours.** A community board for offers and requests (charging, water, lifts, cold storage), restock orders pooled between spazas, nearby shops, clinics and food prices, savings calculators.',
        '**Built for everyone.** Accessibility settings for people who are deaf, hard of hearing, blind or have low vision (flash, vibration, large-text and spoken alerts, screen-reader announcements, text size, high contrast, reduced motion). Four languages, offline, low data.',
      ] },
    ],
  },
  {
    id: 'stand-out', title: 'What makes this solution stand out',
    blocks: [
      { p: `Kasi Grid brings a community closer together instead of pulling people apart. Most apps ask you to look at a screen alone. Kasi Grid only works when neighbours take part: an outage is real because three neighbours say so, help reaches a dark home because a neighbour offers it, and a spaza saves money because other spazas order with it. The technology is there to get people talking to the people next door, which is the old township spirit of ubuntu, "I am because we are", in a form that fits a phone.` },
      { ul: [
        '**Neighbours make it true.** Three different neighbours must agree before an outage is verified, so the alert is a shared act, not a post you scroll past. Neighbours then vote "back on for me" to close it.',
        '**Help travels door to door.** A neighbour with a generator, a gas stove or a charger offers it on the community board and shows on the street map as a gold light, with a thread running to the nearest dark home. People who need a lift, water, charging or cold storage for medicine can ask the street.',
        '**Shops grow together.** Spazas order stock as one group for lower prices, and see what an outage costs them, so a local business is held up by its neighbours.',
        '**No one is left out.** It works anonymously, offline and on a basic phone, in four languages, for people who are deaf, hard of hearing, blind or have low vision, so the person who most needs the community is not the person the app forgets.',
        '**Trust, not rumour.** Because the information comes from real neighbours and is checked by more than one, it replaces the rumour mill with something people can rely on.',
        '**It protects the most vulnerable.** A live battery countdown and a one-tap ambulance call exist because the people closest to someone on a medical device are their neighbours and family.',
      ] },
    ],
  },
  {
    id: 'unfair', title: 'Unfair advantage',
    blocks: [
      { ul: [
        '**A network of neighbours, not a feed.** The product only works when people in a community take part, so each person who joins makes it better for the next, and the trust it builds between neighbours is something a copy of our screens cannot copy.',
        '**No dependence on anyone else\'s data.** Loadshedding apps stop working when there is no official schedule. Our source is the neighbours, so the service keeps working where official systems are silent.',
        '**It still works when the power and signal go.** The app works offline and queues posts until signal returns.',
        '**The data improves with every report and stays local.** Each verified outage adds to a record of when and how long outages happen in that community. A newcomer can copy our screens but not that history or the trust around it.',
        '**We are close to the problem.** Two 22-year-old South Africans who live with these outages: a developer who ships, and a biomedical engineering student who knows how people depend on power for health.',
      ] },
    ],
  },
  {
    id: 'segments', title: 'Customer segments',
    blocks: [
      { table: [
        ['Segment', 'Who exactly', 'Why them'],
        ['Township households (primary)', 'Adults 18 to 55 in low-income households (roughly under R10,000 a month) in Gauteng to start, using prepaid electricity and often one shared smartphone on prepaid data.', 'They feel unscheduled outages first and cannot absorb spoiled food. They need a free, low-data, offline tool in their own language.'],
        ['Spaza shops and small traders (primary)', 'Owner-operators aged 25 to 55 with a fridge or freezer and mobile money.', 'An outage means spoiled stock and lost sales the same day, and buying alone costs more.'],
        ['Medically dependent households (priority)', 'Families using oxygen concentrators, nebulisers, CPAP or dialysis at home, and their carers (often an adult child aged 25 to 60).', 'The stakes are highest: they need to know how long a battery lasts and who to call.'],
        ['Neighbours who can help (secondary)', 'People with a generator, solar kit, borehole or car; ward and street committees.', 'They turn the board into real help and spread the app by trust.'],
        ['Partners (later)', 'Equipment suppliers, carers, clinics, wholesalers.', 'They fulfil requests and give a way to earn without charging households.'],
      ] },
      { p: 'Entry point: a few suburbs in Johannesburg first, in English plus the main local languages, then other cities. The first users to reach are spaza owners and community groups, because one shop owner or street committee brings in many households.' },
    ],
  },
  {
    id: 'metrics', title: 'Key metrics',
    blocks: [
      { note: 'Targets for a first six-month Johannesburg pilot. They are goals, not results.' },
      { table: [
        ['Area', 'Metric and target'],
        ['Reach', '3,000 active users in 10 or more suburbs; 150 spaza shops, 40 in a shared restock order; 100 medically dependent households with a battery plan'],
        ['Trust and accuracy', '85% of verified outages later confirmed as real; median time from first report to verified alert under 20 minutes; 60% of "likely outage" warnings followed by an outage in the stated window'],
        ['Impact', '50% of users who get an early warning take action; spaza owners report spoiled stock down 20%; pooled orders save at least 8%; medical households knew their battery time in 80% of outages'],
        ['Engagement', '40% weekly return; 30% of users have filed a report'],
        ['Sustainability', 'At least 3 partners signed; cost per active user under R5 a month'],
      ] },
      { p: 'How we measure: built-in analytics that identify no one, a short in-app survey after an outage, and follow-up calls with a sample of spaza owners and medical households.' },
    ],
  },
  {
    id: 'channels', title: 'Distribution channels',
    blocks: [
      { p: 'Kasi Grid is a web app that installs from the browser, with no app store, no download fee and no large download. Users open a link, tap Add to home screen, and it works offline.' },
      { ul: [
        '**WhatsApp.** Every verified outage and restock order has a one-tap share button; spaza owners invite other spazas.',
        '**Spaza shops as local hubs.** A QR code and poster at the counter; the owner has their own reason to promote it (restock savings).',
        '**Community leaders and groups.** Ward and street committees, community WhatsApp and Facebook groups, churches and stokvels.',
        '**Carers, clinics and equipment suppliers.** For medically dependent households, the link is handed out with the equipment or at a visit.',
        '**Community radio** in local languages for people without smartphones or data.',
        '**Pilot launches in a few suburbs** first, then repeat the approach suburb by suburb.',
      ] },
    ],
  },
  {
    id: 'costs', title: 'Cost structure',
    blocks: [
      { note: 'Estimates for a six-month Johannesburg pilot with about 3,000 users. Planning figures, not quotes.' },
      { table: [
        ['Monthly running cost', 'Per month'],
        ['Hosting and database (serverless host, hosted database, backups)', 'R600'],
        ['Outage and weather data (EskomSePush API, weather feed)', 'R500'],
        ['Domain, monitoring and error tracking', 'R300'],
        ['Community moderators (3 people, R1,500 stipend each)', 'R4,500'],
        ['Outreach and data (airtime for community champions, printing)', 'R3,000'],
        ['Contingency (10%)', 'R890'],
        ['Total', 'about R9,800'],
      ] },
      { table: [
        ['One-off cost', 'Amount'],
        ['Translation review into local languages', 'R6,000'],
        ['Carer and supplier vetting, through a partner', 'R5,000'],
        ['POPIA and terms review', 'R8,000'],
        ['Launch posters, QR codes and counter stands', 'R4,000'],
        ['Total', 'R23,000'],
      ] },
      { p: 'Six-month total: about R81,800. Cost per user: about R3.30 a month at 3,000 users. Payment fees (about 3% of each booking or restock order) are variable and are paid from the booking fee or supplier commission, so households do not carry them. Founders\' time is not costed.' },
    ],
  },
  {
    id: 'revenue', title: 'Revenue streams',
    blocks: [
      { p: 'Households pay nothing. Reporting, alerts, forecasts and the medical battery plan stay free, because charging would exclude the people who need it most. The money comes from businesses and partners that gain from the community the app builds.' },
      { table: [
        ['Stream', 'Price', 'Month-6 estimate'],
        ['Spaza Pro: advanced outage-cost reports and stock alerts', 'R49 a month', '40 paying shops = R1,960'],
        ['Restock commission: the wholesaler pays a share of pooled orders', '4% of order value', '40 shops x 2 orders x R2,500 = R200,000, so R8,000'],
        ['Booking commission: oxygen, battery backups and carers', '10% of the booking (about R45 on R450)', '60 bookings = R2,700'],
        ['Partner listing: verified carers, suppliers and clinics', 'R299 a month', '5 partners = R1,495'],
        ['Sponsorship or municipal dashboard', 'R3,000 a month', '1 sponsor = R3,000'],
        ['Total', '', 'about R17,155 a month'],
      ] },
      { p: 'Against running costs of about R9,800 a month, that leaves about R7,000 a month by month 6, enough to cover the one-off costs within about three more months. These are projections that depend on the user targets above; the wholesaler commission and sponsor figure are not yet agreed with anyone.' },
    ],
  },
]

export const ssdlc = [
  {
    id: 'requirements', title: 'Security requirements (risk assessment)',
    blocks: [
      { p: 'Principle: collect as little personal data as possible and never trust one report. No account is needed to use the app. An optional account stores only a cell number or email, a salted password hash and a few settings. Location is optional and only ever shared when the person taps a button.' },
      { table: [
        ['Risk', 'Likelihood / impact', 'Control'],
        ['Fake or spam reports', 'High / High', 'An outage is verified only when 3 different devices agree. Write endpoints are rate limited and text length is capped.'],
        ['Abuse and denial of service', 'Medium / Medium', 'Global API limit and a stricter limit on writes. The app works offline, so people still see their last data.'],
        ['Unauthorised admin access', 'Medium / High', 'The admin area is off unless a secret token is set; it is compared in constant time and rate limited.'],
        ['Privacy (location, identity, health)', 'Medium / High', 'No names are needed. Reports are tied to a community; an exact pin is optional and board posts are shown only to about 100 m. Medical battery details stay on the phone. A POPIA review is planned before launch.'],
        ['Leaked secrets', 'Medium / High', 'Keys and tokens live in server environment variables only.'],
        ['Unsafe medical guidance', 'Medium / High', 'Battery estimates are cautious and show their assumptions; the app prompts a call to the ambulance and says it is not medical advice.'],
        ['Malicious carer or supplier', 'Low / High', 'Vetting through a partner and admin approval before listing; quick removal.'],
        ['Account takeover and password guessing (optional accounts)', 'Medium / High', 'Passwords are stored only as salted scrypt hashes and never returned. Sign-in is rate limited, and an unknown account takes as long to refuse as a wrong password. Sessions are random tokens in an HttpOnly, SameSite cookie for 90 days; only a hash of the token is stored. A person can sign out or delete the account (and every session) in the app. The medical plan and emergency contact never leave the phone.'],
        ['Injection and cross-site scripting', 'Low / High', 'Database queries use parameters; React renders user text as text.'],
      ] },
      { p: 'Residual risk: coordinated fake reports from many devices. Accepted for the pilot, watched with the admin moderation tools, and reduced by raising the verification threshold in sensitive areas.' },
    ],
  },
  {
    id: 'threat', title: 'Threat modelling and design review',
    blocks: [
      { p: 'Method: STRIDE across the phone app, the API, the database, the admin page and the third-party data sources.' },
      { table: [
        ['Threat', 'Where it applies and what we do'],
        ['Spoofing', 'Anonymous use is limited per device. Optional accounts use salted password hashes, rate-limited sign-in and HttpOnly session cookies. The admin page uses a secret token.'],
        ['Tampering', 'All database queries are parameterised. Reports are validated and trimmed on the server. Prices for bookings are set on the server, never by the client.'],
        ['Repudiation', 'Moderation actions are limited to the admin page.'],
        ['Information disclosure', 'Anonymous reports, optional pins, board posts rounded to about 100 m, secrets never sent to the browser. Bookings are private to a device and never cached by the service worker.'],
        ['Denial of service', 'Rate limits, request size limits, an offline-capable app.'],
        ['Elevation of privilege', 'The admin area answers "not found" unless it is switched on.'],
      ] },
      { p: 'Design decisions that reduce risk: the browser never calls the data providers directly for protected data (the server does); verification needs three devices; the medical plan never leaves the phone.' },
    ],
  },
  {
    id: 'development', title: 'Development (secure coding practices)',
    blocks: [
      { ul: [
        'Secrets in environment variables, never in code or the browser; `.env` is git-ignored.',
        'Parameterised SQL everywhere; input validated on the server (length, type allow-lists, no links, no phone or ID numbers in public posts).',
        'React renders user text as text, which blocks script injection.',
        'Timing-safe comparison for the admin token; security headers (nosniff, frame deny, referrer policy).',
        'Per-IP rate limits on the API, writes and admin routes; request bodies capped at 10 KB.',
        'Small, separated modules for shared logic, each with unit tests; every change is a reviewed commit in git.',
        'Accessibility built in from the start (screen-reader text, large text, flash and vibration alerts), because a safety alert nobody can perceive is a safety failure.',
      ] },
    ],
  },
  {
    id: 'testing', title: 'Security testing',
    blocks: [
      { ul: [
        '**111 automated tests passing** (`npm test`): calculations, translations, the full API including admin, care bookings, rate limits and the outage rules, community and location rules, the battery model and alert stages, and accounts (registration, sessions, sign-out, settings sync, bookings following a person, deletion).',
        '**Dependency scan (`npm audit`):** run during the build of this submission. All findings in production dependencies (body-parser, ip-address and the PDF library) were fixed by updating, and the production scan now reports **0 vulnerabilities**. Two moderate/high findings remain in the development-only build tool (Vite), which is not shipped to users.',
        '**Manual and browser testing:** every main flow was run in a real browser: wizards, report and booking submission, location and pin rules (pins outside South Africa or far from the community are rejected), the battery countdown and ambulance banner, and the emergency card.',
        '**Planned before launch:** an independent penetration test, a Content-Security-Policy header, load testing of the write endpoints, and a backup and restore test.',
      ] },
    ],
  },
  {
    id: 'assessment', title: 'Assessment and secure integration',
    blocks: [
      { p: 'Overall risk for a pilot: low to medium. The app holds no passwords, payment details or precise home addresses, so a breach exposes little.' },
      { ul: [
        '**Data providers** (EskomSePush, weather, OpenStreetMap) are called by the server with keys kept server-side, and answers are cached to save quota. Building outlines for the map come through our own server so the public service is not hit by every visitor.',
        '**Hosting:** the front end is static and the API runs as a serverless function; data lives in a hosted libSQL database reached with its own token over an encrypted connection. Serverless means no long-lived server to patch, and rate limits are per instance (a known limit, noted in the deployment guide).',
        '**Payments:** none are taken yet. Carers, equipment prices and bookings are labelled samples. Before real payments we will use a certified provider so card details never touch our servers.',
        '**Open items before real users:** a POPIA review, a Content-Security-Policy header, a backup and restore test and an independent security check.',
      ] },
    ],
  },
]

export const canvas = {
  problem: ['Unscheduled power and water outages in townships with no published, trusted information (load reduction, cable theft, substation faults; 22 major Johannesburg water outages in two weeks of January 2026).', 'Households on medical devices cannot tell if a backup will last.', 'Small businesses lose stock and sales and cannot see the cost.'],
  segments: ['Township households (free)', 'Medically dependent households and their carers', 'Spaza shops and small traders (Pro)', 'Suppliers, carers and clinics (partners)', 'Municipalities, banks, insurers and NGOs (sponsors)'],
  uvp: 'The outage app that brings a community closer together: neighbours verify outages, offer help door to door and buy together, so technology connects people instead of isolating them. Free, anonymous, offline, for everyone, anywhere in South Africa.',
  solution: ['Live satellite street with verified outages', 'Forecast and typical duration', 'Medical battery countdown, alerts and ambulance call', 'Care and equipment booking', 'Outage-cost planner and restock orders', 'Community board; accessibility; four languages'],
  channels: ['WhatsApp sharing from the app', 'Spaza shop counters (QR code)', 'Community groups and ward committees', 'Clinics, carers and equipment suppliers', 'Installable web app, no app store'],
  revenue: ['Spaza Pro about R49 a month', 'Commission on restock orders (4%) and bookings (10%)', 'Partner listings about R299 a month', 'Municipal dashboard or sponsorship about R3,000 a month'],
  costs: ['About R9,800 a month to run a 3,000-user pilot', 'About R23,000 one-off (translation review, vetting, POPIA, launch print)', 'Moderators, data and outreach are the largest items'],
  metrics: ['Verified outages later confirmed (85%)', 'Median time to verification (under 20 min)', 'Weekly active users and suburbs', 'Spoiled stock reduced for spazas (20%)', 'Cost per active user (under R5)'],
  unfair: ['Community-generated, device-verified outage history per community that does not exist elsewhere', 'Trust in township networks', 'A biomedical-engineering view of power dependence', 'Works where official data is silent'],
  assumptions: 'Hypotheses to validate, not results: spaza willingness to pay, municipal willingness to buy, supplier and carer partnerships, and whether a bank would offer an outage product.',
}

export const demo = {
  intro: 'Open the live app or the repository link. The demo build opens with a verified outage, a forecast and a typical duration. Items marked Sample (carers, equipment prices, some board posts, outage history) are made up and labelled so in the app.',
  script: [
    ['0:00-0:10', 'Title slide, then the app on the satellite street', '"Loadshedding is over. But in kasi the power and water still go off, and nobody knows what is real. This is Kasi Grid."'],
    ['0:10-0:25', 'The street goes dark; open Today for the verified outage and the map', '"Three different neighbours reported no power, so it is a verified outage, not a rumour. It shows on the map, and the app says it is usually back around 09:30, because it has learned how long cuts last here."'],
    ['0:25-0:40', 'Drag the 48-hour slider; show the forecast card', '"It learns the pattern too. Power cuts here are most likely Thursday evening. It shows its confidence and says when it does not have enough data."'],
    ['0:40-1:00', 'Deliver tab: the battery plan, then the live countdown', '"Gogo uses an oxygen concentrator. Her family enters the device and battery and the app counts down the real hours, using the battery display for accuracy." (Mulanga)'],
    ['1:00-1:15', 'The alert banner: Call ambulance; show the emergency card', '"When time runs low it alerts, and the ambulance is one tap away. If you cannot speak on the phone, the card texts your location to a contact." (Mulanga)'],
    ['1:15-1:25', 'Business tab: outage costing you now', '"For a spaza owner, what this outage has cost so far, and what would stop it."'],
    ['1:25-1:30', 'Community board with an offer from a neighbour, then the accessibility button', '"A neighbour offers a charger, a spaza orders with others, and it works for people who are deaf or blind, in four languages, offline. Kasi Grid brings a community closer together."'],
  ],
  tryit: [
    'Satellite street: drag the slider to see the next 48 hours; tap the map to explore it full screen.',
    'Today: the verified outage, the outage map and the forecast.',
    'Deliver: enter 300 W and 1000 Wh, tap "Switched to battery now", and watch the countdown and alerts.',
    'Share: see what neighbours offer or ask for (charging, water, lifts), and post your own in three steps.',
    'Alerts: file a report in three steps, with an optional exact pin.',
    'Accessibility button (top right): try the deaf and blind quick setups, text size and high contrast.',
    'Settings: find any place in South Africa and join its community.',
  ],
  sample: 'Real: the loadshedding status, official tariffs, map and building data (OpenStreetMap), weather, and all the app logic, which is covered by 111 automated tests. Sample and labelled: outage history for the demo, carers, equipment prices, payments, and some board posts.',
}
