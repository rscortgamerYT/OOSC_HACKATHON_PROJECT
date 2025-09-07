# Personal Integrity & Safety – Panic Alert App (SMS + WhatsApp + Reaction Log)

A hackathon-ready, full-stack web app you can deploy quickly. It sends **SMS and WhatsApp** alerts to your emergency contacts with **one-tap reaction links** so they can mark **Responding** or **Can't Respond**. The app logs everything for your demo: alert events, delivery attempts (best-effort), and contact reactions.

## Features
- One-click **Panic Button** to broadcast alerts.
- Sends **SMS** and **WhatsApp** via Twilio (configurable).
- Each contact gets a **unique secure link** to mark their response.
- **Dashboard** shows alerts, statuses, and logs.
- **SQLite** database – no external DB needed.
- **Dockerfile** included (run anywhere).

## Quick Start (Local, without Docker)
1. Install Node 18+ and npm.
2. In a terminal:
   ```bash
   cd server
   cp .env.example .env
   npm install
   ```
3. Open `.env` and set these:
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` from your Twilio console.
   - `TWILIO_SMS_FROM`: Your Twilio SMS number (e.g., `+1415...`).
   - `TWILIO_WHATSAPP_FROM`: Your Twilio WhatsApp-enabled number (e.g., `whatsapp:+1415...`) or sandbox sender if using sandbox.
   - `APP_BASE_URL`: Public URL where this app will be reachable, e.g. `http://localhost:3000` for local, or your deployed domain for production.
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:3000 to finish setup: add your name and emergency contacts.

### Twilio WhatsApp Notes
- For quick demos, enable the **Twilio WhatsApp Sandbox** in your Twilio console. Set `TWILIO_WHATSAPP_FROM` to the sandbox sender (format `whatsapp:+1415...`) and make sure your contacts **join your sandbox** (Twilio gives a join code). In production, you’ll need a WhatsApp-approved sender.
- SMS will work immediately if your Twilio number supports SMS and the destination is in a supported country.

## Docker (One-Command Run)
1. Ensure Docker is installed.
2. Copy `.env.example` to `.env` and fill in values.
3. From the project root run:
   ```bash
   docker build -t personal-safety-app .
   docker run -p 3000:3000 --env-file ./server/.env personal-safety-app
   ```
4. Open http://localhost:3000

## Deploy (Free-friendly options)
- **Render** or **Railway**: Deploy the Docker image or Node app. Set environment variables from `.env` in your service settings.
- **Heroku**: Use the provided `Procfile`. Add env vars and a persistent volume is **not** required; SQLite file will be created on dyno but resets on restarts. For real persistence, use a small Postgres add-on and adjust `DB_URL` (not necessary for hackathon demo).

## Project Structure
```
personal-safety-app/
  client/
    index.html
    response.html
    app.js
    response.js
    styles.css
  server/
    server.js
    db.js
    package.json
    .env.example
  Dockerfile
  Procfile
  README.md
```
---

## Demo Flow
1. Open the app, complete **Setup**.
2. Press **Panic Button**.
3. Contacts receive **SMS/WhatsApp** with your name, time, and a **link**.
4. They tap the link → get a page with **Responding** or **Can't Respond** buttons (and optional note).
5. Dashboard shows the reactions live (auto-refresh every few seconds).

## Privacy & Safety by Design
- Stores the **minimum** personal data needed (your name and contact numbers).
- Links are short-lived tokens tied to a specific alert.
- You control the **base URL** and hosting.
- For production, add HTTPS, auth, rate limiting, and geofencing rules.
