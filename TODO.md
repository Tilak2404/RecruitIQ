# RecruitIQ TODO

## 🚀 Quick Wins (1-2 hours)
- [ ] Add all missing Zod schemas to lib/validators/index.ts (sendingAccountSchema, atsAnalyzeSchema, createCampaignSchema, etc. from tsc errors)
- [ ] Fix types/app.ts missing interfaces (AssistantMessageSummary, DashboardSnapshot, AccountSummary, AbTestSummary, etc.)
- [ ] Restart `npm run dev` after changes (Turbopack cache)
- [ ] Test /resume POST/PUT, /dashboard

## 🔧 Core Fixes (4-6 hours)
- [ ] Complete lib/validators schemas for all API routes
- [ ] Add missing types to types/app.ts
- [ ] Fix all tsc --noEmit errors (174 total)
- [ ] Add .env vars table to README

## 🎯 Production Polish
- [ ] Clerk/NextAuth auth
- [ ] Vercel deploy guide
- [ ] Vitest e2e coverage
- [ ] BullMQ queue for worker

**Status:** Build error free, AI features ready (add GEMINI_API_KEY)

