# AI_Agents_For_Outsourcing

This repo currently includes:

- Postgres via `docker-compose.yml`
- Database schema in `db/schema.sql`
- FastAPI backend (authentication + authorization helpers) under `app/`

## Local Setup

1) Start Postgres

`docker compose up -d`

2) Install Python deps

`pip install -r requirements.txt`

3) Configure env

- Copy `.env.example` to `.env`
- Fill in `JWT_SECRET`
- (Optional) Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google login

4) Run API

`uvicorn app.main:app --reload`

API docs: `http://127.0.0.1:8000/docs`

## Auth Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh` (rotates refresh token cookie)
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/google/exchange`
- `POST /auth/link/google`

## Notes

- Refresh token is stored in an `HttpOnly` cookie (path `/auth`).
- Access token is returned in JSON and should be sent as `Authorization: Bearer <token>`.
- Google auth has not yet been tested.
