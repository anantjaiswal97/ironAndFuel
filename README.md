# Iron & Fuel Backend — Deployment & Setup Guide

## Architecture overview

```
┌─────────────────────┐   HTTPS    ┌─────────────────────┐
│ Frontend (Vercel)   │ ─────────> │ Backend (Render)    │
│ React PWA           │            │ Node + Express + TS │
└─────────────────────┘            └──────────┬──────────┘
                                              │
                            ┌─────────────────┼──────────────┐
                            ▼                 ▼              ▼
                       ┌─────────┐      ┌─────────┐   ┌──────────┐
                       │MongoDB  │      │Gemini   │   │   Logs   │
                       │ Atlas   │      │  API    │   │ (Render) │
                       └─────────┘      └─────────┘   └──────────┘
```

## Project structure

```
fitness-backend/
├── src/
│   ├── config/         Environment, logger, database connection
│   ├── middleware/     Auth, validation, error handling, rate limiting
│   ├── models/         Mongoose schemas (User, DietEntry)
│   ├── routes/         URL mappings (/api/auth, /api/diet, /api/ai)
│   ├── controllers/    HTTP request/response handling
│   ├── services/       Business logic (auth, diet, AI)
│   ├── utils/          Helpers (JWT)
│   └── server.ts       Entry point
├── package.json
├── tsconfig.json
└── .env.example        Copy to .env, fill in real values
```

## Local development

### 1. Install dependencies
```bash
cd fitness-backend
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- **MONGODB_URI** — your MongoDB Atlas connection string
- **JWT_SECRET** — generate a long random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **GEMINI_API_KEY** — optional, from aistudio.google.com/apikey

### 3. Run dev server
```bash
npm run dev
```
Server starts at http://localhost:4000. Auto-reloads on file changes (uses tsx watch).

### 4. Test it works
```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."}
```

### 5. Test signup
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'
# Returns { user: {...}, token: "eyJ..." }
```

### 6. Test protected route (use token from signup response)
```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## Production deployment (Render)

### Step 1 — Push to GitHub

1. Create a new GitHub repo (private is fine)
2. Push the `fitness-backend` folder to it:
   ```bash
   cd fitness-backend
   git init
   git add .
   git commit -m "Initial backend"
   git remote add origin https://github.com/<your-username>/fitness-backend.git
   git push -u origin main
   ```

### Step 2 — Deploy on Render

1. Go to https://dashboard.render.com → **New** → **Web Service**
2. Connect your GitHub account, select the `fitness-backend` repo
3. Configure:
   - **Name**: `fitness-backend` (or whatever)
   - **Region**: choose closest to you (Singapore for India)
   - **Branch**: main
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Click **Advanced** → **Add Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your Atlas connection string |
   | `JWT_SECRET` | Long random string (≥32 chars) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `GEMINI_API_KEY` | Your Gemini key (or leave blank) |
   | `FRONTEND_URL` | Your Vercel URL (e.g. `https://fitness-app-nu-pearl.vercel.app`) |
   | `LOG_LEVEL` | `info` |

5. Click **Create Web Service**
6. Wait ~5 minutes for build + first deploy
7. Get your URL — looks like `https://fitness-backend-xxxx.onrender.com`

### Step 3 — Test production

```bash
curl https://your-backend.onrender.com/health
```

If you get `{"status":"ok"}`, the backend is live.

---

## Free tier caveats

**Cold starts (~30 seconds).** Render free tier sleeps services after 15 min idle. First request after sleep takes 30+ seconds while the container boots. Subsequent requests are fast.

Workarounds:
- Accept it for personal use
- Use a free uptime monitor (UptimeRobot.com) to ping `/health` every 14 minutes (keeps it warm but technically against Render's free tier ToS)
- Upgrade to paid ($7/mo) when it actually matters

**MongoDB Atlas M0 limits:**
- 512 MB storage (years of fitness data)
- Shared CPU (small slowdowns possible under heavy load — irrelevant for personal use)
- No backups (set up your own export schedule via cron + Atlas API if you care)

---

## Endpoints reference (Phase 1)

### Public
- `GET /health` — health check
- `POST /api/auth/signup` — create user; returns `{ user, token }`
- `POST /api/auth/login` — log in; returns `{ user, token }`

### Protected (require `Authorization: Bearer <token>`)
- `GET /api/auth/me` — get current user
- `PATCH /api/auth/me` — update profile (name, weight, goals)

### Diet
- `POST /api/diet` — create entry
- `GET /api/diet/:date` — list entries for a YYYY-MM-DD date
- `GET /api/diet/range?start=YYYY-MM-DD&end=YYYY-MM-DD` — list in range
- `DELETE /api/diet/:id` — delete one

### AI
- `POST /api/ai/estimate-nutrition` — `{ description }` → `{ result: {name, calories, protein, fiber, vitamins} }`
- `POST /api/ai/generate-recipes` — `{ existing: [name, ...] }` → `{ recipes: [...] }`

### What's coming in Phase 2
- Workouts (planned/completed)
- Plans for any date
- Progress aggregation endpoints
- Frontend rewrite to use API instead of localStorage

---

## Security notes

This backend ships with:
- **Helmet** — security HTTP headers
- **CORS** — only your frontend can call it
- **bcrypt** — password hashing (never plain text)
- **JWT** — stateless auth tokens
- **Rate limiting** — 5 auth attempts/15min, 30 AI calls/hour
- **Input validation** — Zod schemas on all bodies
- **Authorization checks** — all queries scoped by userId
- **Body size limits** — 100KB cap prevents huge-payload DoS
- **Generic error messages** — never leaks stack traces in production

Things to add for a real public product (later):
- HTTPS-only cookies instead of header-passed JWT (better against XSS)
- Email verification flow
- Password reset via email
- 2FA option
- Audit logging for sensitive actions
- Sentry/equivalent for error tracking
- Backup automation
