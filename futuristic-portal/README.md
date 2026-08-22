# Nexus Campus 2.0 — Futuristic AI Student Portal

A zero-npm student portal built with **HTML, CSS, JavaScript and Python**. It now includes a context-aware campus Copilot, AI PDF study tools, unified smart calendar, notification center, command palette, digital student profile, campus announcements and a persistent admin control center.

## Added in this version

- **Nexus AI Copilot** — answers questions using attendance, assignments, timetable and announcements.
- **AI PDF Study Mode** — server-library PDFs can be summarized, converted into important questions, flashcards and quizzes, or searched with “Ask this PDF”.
- **Smart Calendar** — merges regular classes, assignments, admin-created events/exams and private browser reminders.
- **Notification Center** — automatic deadline, event and campus announcement feed.
- **Ctrl/⌘ + K Command Palette** — instant navigation and “Ask Nexus AI” commands.
- **Student Profile** — futuristic digital ID plus academic snapshot.
- **Expanded Admin Control Center** — manage announcements, events, assignments, timetable cells, profile data and PDFs, plus login analytics.
- **Campus Announcements** — admin-published notices appear on Dashboard, Announcements and Notifications.
- **Futuristic effects** — boot sequence, cursor-reactive glow, holographic cards, animated AI orb, page transitions and reduced-motion support.


## Windows quick start

Double-click `START_NEXUS.bat`. It checks the Python requirement, starts the backend, and opens the admin page automatically.

> Important: `admin.html` is backend-powered. Do **not** open it by double-clicking the HTML file (`file:///.../admin.html`). Use `http://localhost:5500/admin.html` locally, or your deployed website URL.

## Run locally

```bash
python -m pip install -r requirements.txt
python server.py
```

Open `http://localhost:5500`.

The student login remains a demo: any username/password signs in. Credentials are **not stored**. Only login timestamp/IP/count are written to the local login log.

### Admin

Open `http://localhost:5500/admin.html`.

Default local password: `nexus-admin-2026`.

For a public deployment, set the `ADMIN_PASSWORD` environment variable instead of relying on the default.

## Render settings

The included `render.yaml` uses:

```text
Build Command: python -m pip install -r requirements.txt
Start Command: python server.py
```

`pypdf` is required for AI PDF text extraction.

## Persistent data

Admin-managed portal content is stored in:

```text
data/portal_data.json
```

PDF files are stored in:

```text
pdfs/
```

> On hosts with an ephemeral filesystem, uploaded files and JSON changes may reset after a redeploy/restart unless you attach persistent storage or move these records to a database/object-storage service.

## Main files

```text
futuristic-portal/
├── index.html
├── dashboard.html
├── attendance.html
├── assignments.html
├── timetable.html
├── calendar.html
├── notes.html
├── announcements.html
├── profile.html
├── chatbot.html
├── admin.html
├── css/style.css
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── login-fx.js
│   └── theme.js
├── data/portal_data.json
├── pdfs/
├── requirements.txt
├── render.yaml
└── server.py
```
