# Daily Tracker

A personal activity timer. Sign in with Gmail, start what you are doing, and stop when you switch. Times are stored in UTC and shown in IST. Each Google account has its own activities and categories.

## What you can do

- Sign in with Gmail. The first sign-in creates your account and seven categories: Office Work, Learning, Personal Work, Health, Family, Entertainment, and Other.
- Add or rename categories. Categories cannot be deleted.
- Start one activity. Starting another stops the one that is running. Refreshing the page restores the running timer.
- Stop an activity. The duration is calculated on the server from the start and end timestamps.
- Review today in the activity log, and delete a record after confirming.
- See today’s summary and the current Monday–Sunday week.

There is no date picker, no way to type a time, and no way to edit a saved activity.

## Prerequisites

- Python 3.12
- Node.js 20
- A MongoDB Atlas cluster that allows your current IP
- A Google OAuth client (Web application)

In Google Cloud Console, open the OAuth client and set:

- Authorized JavaScript origin: `http://localhost:5173`
- Consent screen status: Testing, with your Gmail added as a test user

`GOOGLE_CLIENT_SECRET` is kept in `backend/.env` and is not used for sign-in. Sign-in only needs the public client ID. If that secret was shared anywhere, rotate it in Google Cloud Console and update `backend/.env`.

## Configure

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in:

`backend/.env`

- `MONGODB_URI` from Atlas. Do not commit this file.
- `MONGODB_DB_NAME=dailytracker`
- `GOOGLE_CLIENT_ID` from the OAuth client
- `CORS_ORIGINS=http://localhost:5173`

`frontend/.env`

- `VITE_API_URL` left empty. The dev server proxies `/api` to `http://localhost:8000`, so the sign-in cookie stays on `localhost`.
- `VITE_GOOGLE_CLIENT_ID` set to the same client ID

## Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API checks MongoDB on startup. If that fails, allow your IP under Atlas Network Access and start it again.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
