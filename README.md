# EvalDesk

University event evaluation web app: create events, import teams, assign jury, collect scores via QR codes, and track progress in real time.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0, JWT, domain restriction

## Roles

- **Admin** – Create events, set allowed domains, upload team CSV, generate QR codes, allocate jury, view live tracking, export CSV
- **Jury** – See assigned teams, open score page via QR/link, submit rubric scores (locks after submit), mark absent
- **Viewer** – Login only (domain-restricted)

## Setup

1. **MongoDB**  
   Run MongoDB locally or set `MONGODB_URI` in `server/.env`.

2. **Google OAuth**  
   - [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials  
   - Create OAuth 2.0 Client ID (Web application)  
   - Authorized redirect URI: `http://localhost:4000/api/auth/google/callback` (or your backend URL)  
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `server/.env`.

3. **Environment**  
   Copy `server/.env.example` to `server/.env` and set:

   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` (e.g. `http://localhost:5173`)
   - `BACKEND_URL` (e.g. `http://localhost:4000`)
   - `ADMIN_EMAILS` – comma-separated emails that get admin role (e.g. `admin@university.edu`)

4. **Install and run**

   ```bash
   npm run install:all
   npm run dev
   ```

   - Backend: http://localhost:4000  
   - Frontend: http://localhost:5173 (proxies `/api` to backend)

## Usage

1. **Login** – Sign in with Google. Allowed domains are enforced when an event is selected (or from event config).
2. **Admin** – Create an event, set allowed domains, upload team CSV (columns: name/team, project/title, domain/track), confirm import, use “Teams & QR” to open/print QR codes per team.
3. **Jury** – In “Jury allocation”, add judge emails and optionally restrict by domains and cap teams per judge. Jury see “My teams” and open score pages via QR or link.
4. **Score page** – Team name/project/domain, 4-criteria rubric (name, weight, max score, slider), “Mark Absent”, Submit (locks form).
5. **Live tracking** – Admin sees total / evaluated / pending / absent, per-judge completion %, domain progress, and CSV export.

## Security

- Jury can only open score pages for teams they are assigned to (domain + allocation).
- Scores lock after submission; all score actions are logged with timestamp and user.
- JWT in cookie and optional `Authorization: Bearer` header.

## Design

- Mobile-first, tablet-optimized for jury on phones/tablets.
- Clean, minimal UI with Tailwind CSS.
