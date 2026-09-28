# GatherLive

## Real-Time Cloud-Based Event Planning & RSVP Tracker

GatherLive is a polished, student-friendly event operations workspace for creating events, tracking attendance, publishing updates, and testing real-time RSVP behavior without paid cloud infrastructure.

![GatherLive dashboard](https://dummyimage.com/1200x650/e8f6f3/1d4e4a&text=GatherLive+dashboard)

## Why this project

Spreadsheets and chat threads are poor sources of truth for attendance. GatherLive puts the event, capacity, RSVP state, and announcements behind one API. The organizer dashboard receives Server-Sent Events (SSE), so counts change without a refresh when an attendee responds.

## Features

- Organizer dashboard with event cards, capacity progress, live counters, response rate, and response trend.
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

The full architecture, cloud migration path, data model, concurrency notes, and Mermaid diagram are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Technology

- Frontend: React 19, Vite 8, CSS, Server-Sent Events client.
- Backend: Node.js, Express 5, CORS.
- Local persistence: JSON file for zero-setup demos.
- Cloud upgrade: Firebase Auth + Firestore, Supabase, or managed PostgreSQL.
- Hosting options: Cloudflare Pages/Vercel for the frontend and Render/Railway/Fly.io/Cloud Run for the API.

## Project structure

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

## Run locally

### Prerequisites

Node.js 20 or newer and npm.

### Install

```powershell
Set-Location -LiteralPath 'I:\Real-Time Cloud-Based Event Planning & RSVP Tracker'
npm install
```

### Start the API

```powershell
node .\server\index.js
```

The API is available at `http://localhost:4000`.

### Start the frontend in another terminal

```powershell
Set-Location -LiteralPath 'I:\Real-Time Cloud-Based Event Planning & RSVP Tracker'
node .\node_modules\vite\bin\vite.js --host 127.0.0.1
```

Open `http://localhost:5173`.

> Windows note: the original workspace folder contains `&`. Some npm Windows shims split that path. Use `Set-Location -LiteralPath` and invoke the quoted Vite executable as shown above. Renaming the folder to remove `&` also resolves it.

### Full-stack shortcut

After moving or renaming the folder to a path without `&`, `npm run dev:full` starts both processes. In the current folder, use the two direct commands above.

## Demo walkthrough

1. Open the dashboard. Seeded synthetic events load from the API.
2. Click `Attendee` in the left role switch.
3. Select an event and choose `Going`, `Maybe`, or `Not going`.
4. Watch the event card, detail panel, and capacity bar update through SSE.
5. Switch back to `Organizer` and publish an announcement.
6. Click `Create event`, complete the form, and publish a new event.
7. Open a second browser tab pointed at the same frontend to demonstrate the live stream.

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

Example RSVP request:

```json
{
  "attendeeId": "demo-attendee",
  "status": "GOING"
}
```

## Testing and validation

```powershell
node --test tests
node --check .\server\index.js
node .\node_modules\vite\bin\vite.js build
```

The smoke tests verify seeded event integrity, unique attendee/event RSVP keys, and capacity invariants. The server calculates all counters from stored RSVP transitions. This is the important concurrency boundary: production should move the same rule into a database transaction or conditional atomic write.

## Cloud deployment plan

### Free-tier student path

1. Create a Firebase or Supabase project.
2. Move identity to Firebase Auth/Supabase Auth.
3. Move events, RSVP records, and announcements to Firestore/Postgres.
4. Deploy the React `dist/` output to Firebase Hosting, Cloudflare Pages, or Vercel.
5. Deploy the API to Render, Railway, Fly.io, or Cloud Run.
6. Set `VITE_API_URL` to the deployed API URL.
7. Configure CORS to the deployed frontend origin and store secrets as platform environment variables.

### Enterprise-shaped path

CloudFront/CDN -> static frontend -> API Gateway -> autoscaled containers or functions -> managed PostgreSQL/Firestore. Redis/pub-sub fans SSE or WebSocket updates across instances. A queue handles reminders, notification delivery, exports, and analytics. Cloud logging, metrics, rate limits, backups, and HTTPS complete the operational layer.

## Security checklist for production

- Verify Firebase/Supabase JWTs in API middleware.
- Enforce organizer ownership on event writes.
- Enforce `(eventId, attendeeId)` uniqueness in the database.
- Never accept counts from the client; calculate them server-side.
- Validate dates, capacity, status transitions, and announcement input.
- Restrict CORS to known origins and add rate limits to RSVP endpoints.
- Keep credentials in environment variables and rotate them outside git.
- Add audit logs, HTTPS, managed backups, monitoring, and error reporting.

## GitHub publication

The repository is ready for GitHub. Run these commands after creating an empty repository:

```powershell
git init
git add .
git commit -m "Build GatherLive real-time RSVP tracker"
git branch -M main
git remote add origin https://github.com/<your-user>/real-time-cloud-event-rsvp-tracker.git
git push -u origin main
```

Suggested topics: `cloud-computing`, `event-management`, `rsvp`, `realtime`, `react`, `nodejs`, `rest-api`, `server-sent-events`, `capacity-management`.

## Limitations and next steps

This local edition intentionally uses synthetic demo identity and a JSON store. For a production release, add real authentication, invite token/QR generation, waitlist promotion, email/push reminders, check-in, database transactions, audit logs, and a managed deployment pipeline.

## License

For educational and portfolio use.
