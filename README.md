# 📅 GatherLive

## Real-Time Cloud-Based Event Planning & RSVP Tracker

GatherLive is a polished, student-friendly event operations workspace for creating events, tracking attendance, publishing updates, and testing real-time RSVP behavior without paid cloud infrastructure.

![GatherLive dashboard](https://dummyimage.com/1200x650/e8f6f3/1d4e4a&text=GatherLive+dashboard)

## Why this project

Spreadsheets and chat threads are poor sources of truth for attendance. GatherLive puts the event, capacity, RSVP state, and announcements behind one API. The organizer dashboard receives Server-Sent Events (SSE), so counts change without a refresh when an attendee responds.

## Features

- Organizer dashboard with event cards, capacity progress, live counters, response rate, and response trend.
- Sign in and account creation page with organizer or attendee role selection.
- Local demo session persistence with sign-out from the profile avatar.
- Attendee view with Going, Maybe, and Not going actions.
- Event creation modal with validation and persisted JSON data.
- One RSVP per attendee per event; changing a response adjusts counters safely.
- Capacity enforcement on the server; the browser cannot edit counts directly.
- Real-time SSE stream for every selected event.
- Announcement publishing and event update feed.
- Responsive UI for desktop, tablet, and mobile.
- Synthetic seed data, no API keys, and no paid services required.

## Architecture

```text
React/Vite browser
       | REST JSON + EventSource
       v
Express API (server/index.js)
       |
       v
JSON persistence (server/data.json)
```


## Technology

- Frontend: React 19, Vite 8, CSS, Server-Sent Events client.
- Backend: Node.js, Express 5, CORS.
- Local persistence: JSON file for zero-setup demos.
- Cloud upgrade: Firebase Auth + Firestore, Supabase, or managed PostgreSQL.
- Hosting options: Cloudflare Pages/Vercel for the frontend and Render/Railway/Fly.io/Cloud Run for the API.

## 🏗️ Project structure

```text
.
├── docs/ARCHITECTURE.md    # system design and cloud scale path
├── public/                 # static assets
├── server/
│   ├── data.json           # synthetic local data store
│   └── index.js            # REST API and SSE stream
├── src/
│   ├── App.jsx             # dashboard, event creation, RSVP, announcements
│   ├── App.css             # responsive visual system
│   └── index.css           # font and global reset
├── tests/smoke.test.mjs    # data integrity tests
├── .env.example
├── package.json
└── README.md
```


## Demo walkthrough

1. Open the dashboard. Seeded synthetic events load from the API.
2. On the welcome screen, choose `Create account`, enter a name, email, and password, then select `Organizer` or `Attendee`.
3. Or choose `Use a demo account` to enter immediately with synthetic identity.
4. Click `Attendee` in the left role switch.
5. Select an event and choose `Going`, `Maybe`, or `Not going`.
6. Watch the event card, detail panel, and capacity bar update through SSE.
7. Switch back to `Organizer` and publish an announcement.
8. Click `Create event`, complete the form, and publish a new event.
9. Open a second browser tab pointed at the same frontend to demonstrate the live stream.

## API reference

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Service health check |
| GET | `/api/events` | List events and live counters |
| POST | `/api/events` | Create a published event |
| GET | `/api/events/:id/analytics` | Capacity and response metrics |
| GET | `/api/events/:id/announcements` | List event updates |
| POST | `/api/events/:id/announcements` | Publish an event update |
| POST | `/api/events/:id/rsvp` | Create or update one attendee RSVP |
| GET | `/api/events/:id/stream` | Subscribe to live event snapshots with SSE |


## Security checklist for production

- Verify Firebase/Supabase JWTs in API middleware.
- Enforce organizer ownership on event writes.
- Enforce `(eventId, attendeeId)` uniqueness in the database.
- Never accept counts from the client; calculate them server-side.
- Validate dates, capacity, status transitions, and announcement input.
- Restrict CORS to known origins and add rate limits to RSVP endpoints.
- Keep credentials in environment variables and rotate them outside git.
- Add audit logs, HTTPS, managed backups, monitoring, and error reporting.

## Limitations and next steps

This local edition intentionally uses synthetic demo identity and a JSON store. For a production release, add real authentication, invite token/QR generation, waitlist promotion, email/push reminders, check-in, database transactions, audit logs, and a managed deployment pipeline.

## 👨‍💻 Author :
Shresthaa Maiti

