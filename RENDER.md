# Deploying AE Store on Render

## Build settings (already set in Render)

- **Runtime:** Docker
- **Dockerfile path:** `./Dockerfile` (default)
- **Branch:** main

## Environment variables

In Render → your Web Service → **Environment**, add:

| Key | Value | Notes |
|-----|--------|--------|
| `PORT` | *(optional)* | Render sets this automatically. |
| `PADDLE_CLIENT_TOKEN` | Your token | Use `test_...` for sandbox or `live_...` for production. |
| `SESSION_SECRET` | *(recommended)* | A long random string for admin session cookies. If omitted, a random one is generated per deploy. |
| `ADMIN_INITIAL_PASSWORD` | Your choice | Creates the first admin if none exists. If an admin already exists (e.g. from a pushed DB), setting this **resets** the admin password to this value on startup. Set it, redeploy, log in as `admin` with that password, then remove it from env. |

To reuse your local `.env`: in Render click **Add from .env** and paste the contents (remove or redact any secrets you don’t want on Render).

## Instance

- **Starter ($7/mo)** is enough to run the app.
- **Free** tier can work for testing but has limits (spins down when idle, no persistent disk).

## Database (SQLite)

The app stores data in `data/store.db` inside the container. On Render’s free/standard instances this filesystem is **ephemeral** (data is lost on redeploy). For a real store you can later add a **persistent disk** and set `SQLITE_DB_PATH` to a path on that disk.
