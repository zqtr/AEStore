# AE Graphics Store

A graphics selling store with a customizable admin dashboard.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize the database (creates `data/store.db` and seeds products):
   ```bash
   npm run init-db
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open in browser:
   - **Store:** http://localhost:3000
   - **Admin:** http://localhost:3000/admin

## Admin login

- **Username:** `admin`
- **Password:** `BOESSAtest`

Change the password after first login via **Admin → Change password**.

## Features

- **Store:** All packages listed in two sections (General, FiveM) with prices. Add to cart, then **Checkout** to pay or place an order.
- **Payments (Paddle):** When all cart items have a **Paddle price ID** (`pri_...`) set in Admin, checkout opens **Paddle Checkout (overlay)**. After `checkout.completed`, the store saves an order marked `paid` with the Paddle transaction ID.
- **Cart & checkout:** Add to cart from the store or product page. At checkout you enter name and email, then pay via Paddle.
- **Admin dashboard:** Sign in, edit products (name, price, category, description, Paddle price ID), add/delete products, change admin password, log out.

## Environment variables (how to view and edit)

The app reads variables from a **`.env`** file in the project root (and from your system env if no file exists).

- **View env:** Open **`.env`** in your editor, or in the terminal run:
  ```bash
  cat .env
  ```
  (From the project folder: `cd "/Users/abmhndi/Desktop/AE Store"` then `cat .env`.)

- **Create `.env`:** Copy the example file and edit:
  ```bash
  cp .env.example .env
  ```
  Then edit `.env` with your values. See **`.env.example`** for the list of supported variables.

- **Current variables:** `PORT`, `SQLITE_DB_PATH`, `SESSION_SECRET`, `PADDLE_CLIENT_TOKEN`. The server loads `.env` on start via `dotenv`.

## Paddle (full payment)

1. Include Paddle products and prices in your Paddle dashboard. For each item you sell, you’ll need a **Price ID** (`pri_...`).
2. Create a **client-side token** in Paddle dashboard → **Developer tools → Authentication**. Tokens start with `test_` (sandbox) or `live_` (production).
3. Set `PADDLE_CLIENT_TOKEN` in `.env`.
4. In **Admin → Edit product**, set **Paddle price ID** to the matching `pri_...`.
5. In the store, add products to cart → **Checkout** → **Pay with Paddle**. On successful payment, `checkout.completed` triggers saving the order in the store with `payment_provider=paddle` and the Paddle transaction ID.

## Making the website live

To put the store on the internet you need to run the Node server on a host that is reachable from the web. Below are two common approaches.

### Option A: PaaS (easiest)

Use a platform that runs Node.js and gives you a URL (and optional custom domain).

1. **Railway** ([railway.app](https://railway.app))
   - Sign up, create a new project, then **Deploy from GitHub** (push your code to a GitHub repo first).
   - Add a **Service** and connect the repo; set **Start Command** to `npm start` (or leave default if it runs `node server.js`).
- In **Variables**, add `PADDLE_CLIENT_TOKEN` (and optionally `PORT`; Railway usually sets `PORT` for you).
- Deploy. You’ll get a URL like `https://your-app.up.railway.app`. Use this as your live site.

2. **Render** ([render.com](https://render.com))
   - New **Web Service**, connect your GitHub repo.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
- Add env vars: `PADDLE_CLIENT_TOKEN` (and `PORT` if needed).
   - **Recommended:** set `SESSION_SECRET` to a long random string.
   - **If you want your data to persist:** attach a **Disk** and set `SQLITE_DB_PATH=/var/data/store.db` (or your chosen mount path).
- Deploy. Use the generated URL (e.g. `https://your-app.onrender.com`).

3. **Fly.io** ([fly.io](https://fly.io))
   - Install `flyctl`, then in your project folder: `fly launch` and follow the prompts. Use a **Dockerfile** or a **Node** buildpack; start command `npm start`.
- Set secrets: `fly secrets set PADDLE_CLIENT_TOKEN=your_token`
   - Your app will be at `https://your-app.fly.dev`.

**After deploy:** Change the admin password (Admin → Change password).

### Option B: VPS (your own server)

On a Linux VPS (DigitalOcean, Linode, AWS EC2, etc.):

1. **Install Node.js** (e.g. v18 or v20 LTS) and clone or upload your project.
2. **Install dependencies:** `npm install` (no `devDependencies` needed for production).
3. **Environment:** Create a `.env` with `PADDLE_CLIENT_TOKEN` and optionally `PORT=3000`.
4. **Run with PM2** (keeps the app running and restarts it if it crashes):
   ```bash
   npm install -g pm2
   pm2 start server.js --name ae-store
   pm2 save
   pm2 startup
   ```
5. **Domain & HTTPS:** Point a domain (A record) to your server’s IP. Use **Nginx** (or Caddy) as a reverse proxy and get a free SSL certificate (e.g. **Let’s Encrypt** with `certbot`). Then your live URL is `https://yourdomain.com` and Terms URL is `https://yourdomain.com/terms`.

### Checklist before going live

- [ ] Code is on GitHub (or your chosen Git host) if you use PaaS.
- [ ] `PADDLE_CLIENT_TOKEN` is set to your **production** Paddle client token on the host.
- [ ] Admin password is changed from the default.
- [ ] Products have the correct Paddle **price IDs** (`pri_...`) if you use payments.

## Tech

- Node.js, Express, SQLite (better-sqlite3), bcryptjs, static HTML/CSS/JS. Paddle Checkout via Paddle.js (`https://cdn.paddle.com/paddle/v2/paddle.js`).
