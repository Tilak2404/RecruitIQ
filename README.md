# RecruitIQ

RecruitIQ is an AI-powered platform for job outreach automation. It helps freshers and entry-level engineers find opportunities by analyzing resumes for ATS compatibility, generating personalized recruiter emails using Google Gemini, managing campaigns, tracking replies, and automating follow-ups.

## Key Features
- **ATS Analyzer**: Match resume against job descriptions, get keyword gaps and ATS score.
- **AI Email Generation**: Personalized outreach emails tailored to company/persona.
- **Campaign Management**: Bulk scheduling, A/B testing, retries.
- **Reply Analysis**: Sentiment, intent detection, suggested responses.
- **Automation**: Cron-based sending and follow-ups with Gmail/SMTP.
- **Dashboard**: Analytics, logs, recruiter import (CSV).

## Tech Stack
- Next.js 15 (App Router)
- Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui
- Google Gemini AI
- Nodemailer, PDF-parse, node-cron

## Quick Setup
1. `npm install`
2. Copy `.env.example` to `.env`, add `DATABASE_URL`, `GEMINI_API_KEY`, etc.
3. `npx prisma db push && npx prisma generate`
4. `npm run dev` (app) + `npm run worker` (automation)

See original README content for full env vars and Gmail notes.

Repo: https://github.com/Tilak2404/RecruitIQ
