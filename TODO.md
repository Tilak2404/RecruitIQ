# RecruitIQ ATS Upgrade Plan

## 1. Dependencies (Install)
npm i mammoth docx pizzip file-saver @types/file-saver

## 2. Types (types/app.ts)
Extend AtsAnalysisResult → AdvancedAtsResult { sections[], keywordCategories {}, bulletImprovements[] }

## 3. Resume Services (lib/services/resume.ts)
- docxParse() → sections {name, content[]}
- sectionParser (headings → Summary/Skills/Exp/Projects/Edu)

## 4. Gemini ATS (lib/services/gemini.ts)
Upgrade analyzeResumeAgainstJobDescription prompt (sections, categories, role, metrics/verbs, subscores)

## 5. New APIs
- app/api/resume/analyze/route.ts (POST JD → advanced analysis)
- app/api/resume/apply/route.ts (POST selections → patched text)
- app/api/resume/export/route.ts (POST sections → docx buffer)

## 6. UI (app/resume/page.tsx, components/resume/resume-lab-client.tsx)
- Section accordions
- Checkbox suggestions (diff)
- Apply/Export buttons

## 7. Test (tests/unit/ats.test.ts)

Progress: 5/7 (deps, types, parsers, APIs, TODO updated)
