# Run RAJAONAM 2026 locally with Docker

## Prerequisites
- Docker + Docker Compose v2 (`docker compose` command)

## Setup
1. Copy the env template and fill in your real keys:
   ```bash
   cp backend/.env.docker.example backend/.env.docker
   ```
   Razorpay/Twilio/Resend keys are optional for local browsing, but payments,
   WhatsApp and emails need them.
   Note: `MONGO_URL`, `DB_NAME` and `CORS_ORIGINS` are set by docker-compose —
   do not add them to `.env.docker`.

2. Build and start everything:
   ```bash
   docker compose up --build
   ```

3. Open:
   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8001/docs
   - MongoDB: mongodb://localhost:27017 (data persists in the `mongo_data` volume)

## How it's wired
- Frontend (nginx) proxies `/api/*` to the `backend` container, mirroring the
  production ingress. The React build uses `REACT_APP_BACKEND_URL=http://localhost:3000`
  so all API calls flow through this proxy.
- Backend connects to the `mongodb` container via the internal Docker network.

## Common commands
```bash
docker compose up -d          # run in background
docker compose logs -f backend
docker compose down           # stop (keeps DB data)
docker compose down -v        # stop + wipe DB data
```
