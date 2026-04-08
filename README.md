# RecruitIQ

RecruitIQ is an AI-powered job outreach automation platform built with Next.js App Router, Tailwind CSS, Prisma + PostgreSQL, Nodemailer, Gemini, papaparse, pdf-parse, and node-cron.

## Core Features

- PDF resume upload and extraction
- Manual recruiter entry plus CSV import
- Gemini-powered personalized recruiter emails
- Safe pending-only sending with Gmail/custom SMTP
- Schedule pending emails for later delivery
- Worker-driven scheduled sends and automatic follow-ups
- Recruiter reply analysis with sentiment, intent, summary, and suggested reply
- Persistent AI assistant memory stored in PostgreSQL
- LinkedIn DM generation and outreach strategy help
- Best-time-to-send guidance from heuristics and response history
- Status-safe outreach tracking with pending, sent, replied, and failed states

## Main UI

- `/dashboard`
- `/campaigns`
- `/accounts`
- `/analytics`

## New APIs

- `POST /api/assistant`
- `POST /api/send-email`
- `POST /api/schedule-email`
- `POST /api/analyze-reply`
- `POST /api/follow-up`

## Environment

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL`
- `DIRECT_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `APP_BASE_URL`
- `CANDIDATE_NAME`
- `APP_ENCRYPTION_KEY`
- `OUTREACH_WORKER_CRON`
- `OUTREACH_TIMEZONE`

`APP_ENCRYPTION_KEY` is used to encrypt SMTP passwords before saving them in PostgreSQL.

For Supabase + Prisma:

- Set `DATABASE_URL` to the Supavisor transaction pooler on port `6543`
- Include `pgbouncer=true&connection_limit=1` in `DATABASE_URL`
- Set `DIRECT_URL` to the Supavisor session connection on port `5432` for Prisma CLI commands

## Setup

1. Install dependencies:
   `npm install`
2. Configure `.env`
3. Sync the Prisma schema:
   `npx prisma db push`
4. Seed starter data:
   `npm run prisma:seed`
5. Start the web app:
   `npm.cmd run dev`
6. In a second terminal, start the automation worker:
   `npm.cmd run worker`

## Gmail Notes

- Use a Google App Password, not your normal account password.
- Recommended settings: `smtp.gmail.com`, port `587`, secure `false`.

## CSV Format

Use this header exactly:

```csv
name,email,company
Jane Doe,jane@company.com,Acme
```

## Worker Behavior

- The worker runs on `OUTREACH_WORKER_CRON`
- Every cycle it:
  - queues due follow-ups
  - sends scheduled emails where `scheduledAt <= now`
- The main dashboard send action still only sends `NOT_SENT` emails that are due now

## Architecture Notes

- `lib/services/gemini.ts`: email generation, reply analysis, follow-up generation, assistant responses
- `lib/services/mailer.ts`: pending-only send engine and scheduled sends
- `lib/services/automation.ts`: scheduling and automatic follow-up orchestration
- `lib/services/assistant.ts`: persistent assistant memory and context-aware chat
- `lib/services/replies.ts`: recruiter reply analysis persistence
- `lib/services/strategy.ts`: outreach overview and best-send-time guidance

## Production Notes

- Run the worker as a separate process in production
- Add authentication and tenant scoping before multi-user deployment
- Replace polling-style automation with a queue like BullMQ if you need higher scale

