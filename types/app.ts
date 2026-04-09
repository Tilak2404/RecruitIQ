export type JobTargetPersona = "STARTUP" | "BIG_TECH" | "HR_RECRUITER" | "HIRING_MANAGER";

export type SectionName = "Summary" | "Experience" | "Projects" | "Skills" | "Education" | "Other";

export type EmailStatus = "DRAFT" | "NOT_SENT" | "SENT" | "OPENED" | "REPLIED" | "FAILED";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type SendState = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
export type AssistantRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface ResumeRecord {
  id: string;
  candidateName: string;
  fileName: string;
  extractedText: string;
  createdAt: Date | string;
}

export interface RecruiterSummary {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt?: Date | string;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: "GMAIL" | "CUSTOM";
  fromName: string | null;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  dailyLimit: number;
  hourlyLimit: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CompanyResearchResult {
  company: string;
  overview: string;
  key_products: string[];
  culture: string;
  hiring_focus: string;
  tech_stack: string[];
  recent_signals: string;
  keywords: string[];
  outreach_angle: string;
  cultureNotes: string[];
  recentSignals: string[];
  outreachAngles: string[];
  toneRecommendation: string;
}

export interface AtsAnalysisResult {
  personaTarget: JobTargetPersona;
  atsScore: number;
  keywordMatchPercentage: number;
  matchSummary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  skillGaps: string[];
  suggestedSkillAdditions: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  improvedBulletPoints: string[];
  score?: number;
  sections?: Array<{
    section: SectionName;
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    notes: string[];
  }>;
  missing_skills?: {
    critical: string[];
    important: string[];
  };
  improvements?: string[];
}

export interface StoredAtsAnalysis extends AtsAnalysisResult {
  id: string;
  jobDescription: string;
  resumeText: string;
  useForOutreach: boolean;
  createdAt: Date | string;
}

export interface RecruiterPersonalityProfile {
  tone: "FORMAL" | "BALANCED" | "CASUAL";
  audience: "TECHNICAL" | "HR" | "HIRING_MANAGER";
  rationale: string;
}

export interface EmailQualityScore {
  score: number;
  replyScore: number;
  personalizationScore: number;
  clarityScore: number;
  lengthScore: number;
  ctaStrengthScore: number;
  issues: string[];
  reasons: string[];
  suggestions: string[];
  recruiterPersonality: RecruiterPersonalityProfile;
}

export interface ReplyAnalysisSummary {
  id: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  intent: "INTERVIEW_REQUEST" | "NEED_MORE_INFO" | "REJECTION" | "GENERAL_REPLY" | "UNKNOWN";
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
  confidence: number;
  reply_type: "interested" | "reject" | "ghosting" | "neutral";
  recruiter: { name: string; company: string } | null;
  createdAt: Date | string;
}

export interface ReplyInsightsSnapshot {
  summary: string;
  weakPatterns: string[];
  strengths: string[];
  recommendations: string[];
  responseRateDelta: number;
}

export interface OutreachOverview {
  totalSent: number;
  replies: number;
  responseRate: number;
  pending: number;
  scheduled: number;
  followUpsDue: number;
}

export interface SendTimeSuggestion {
  recommendedDay: string;
  recommendedWindow: string;
  rationale: string;
  confidenceLabel: string;
}

export interface JobOsSettings {
  persona: JobTargetPersona;
}

export interface ApplyReadinessResult {
  ready: boolean;
  score: number;
  blockers: string[];
  improvements: string[];
  summary: string;
  signals: string[];
}

export interface ImprovementLoopSnapshot {
  atsScorePrevious: number | null;
  atsScoreCurrent: number | null;
  atsScoreDelta: number;
  atsScoreLabel: string;
  emailScorePrevious: number | null;
  emailScoreCurrent: number | null;
  emailScoreDelta: number;
  emailScoreLabel: string;
  highlights: string[];
}

export interface PortfolioGenerationResult {
  headline: string;
  summary: string;
  projectDescriptions: string[];
  githubAbout: string;
  portfolioSections: string[];
}

export interface AbTestVariantSummary {
  label: "A" | "B";
  subject: string;
  body: string;
  assignedCount: number;
  replyCount: number;
  responseRate: number;
}

export interface AbTestSummary {
  campaignId: string;
  persona: JobTargetPersona;
  createdAt: Date | string;
  winner: "A" | "B" | "TIE";
  variants: [AbTestVariantSummary, AbTestVariantSummary];
}

export interface AssistantMessageSummary {
  id: string;
  role: AssistantRole;
  content: string;
  metadata?: unknown;
  createdAt: Date | string;
}

export interface CampaignEmailLog {
  id: string;
  recruiterId: string;
  subject: string;
  body: string;
  status: EmailStatus;
  lastError: string | null;
  scheduledAt: Date | string | null;
  lastSentAt: Date | string | null;
  sentAt: Date | string | null;
  openedAt: Date | string | null;
  repliedAt: Date | string | null;
  updatedAt: Date | string;
  followUpStage: number;
  recruiter: {
    name: string;
    company: string;
    email: string;
  };
  sendingAccount?: {
    id: string;
    name: string;
    email: string;
    type: "GMAIL" | "CUSTOM";
    isActive: boolean;
  } | null;
}

export interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  sendState: SendState;
  sendProgress: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  emailLogs: CampaignEmailLog[];
}

export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  sendState: SendState;
  sendProgress: number;
  createdAt: Date | string;
  draftCount: number;
  sentCount: number;
  replyCount: number;
  failedCount: number;
}

export interface AnalyticsSnapshot {
  totals: {
    recruiters: number;
    campaigns: number;
    accounts: number;
    sent: number;
    opened: number;
    replied: number;
    failed: number;
    pending: number;
  };
  responseRate: number;
  openRate: number;
  personalInsights: {
    totalEmailsSent: number;
    responseRate: number;
    bestPerformingMessage: string | null;
    bestTimeToSend: string;
    averageReplyProbability: number;
  };
  replyInsights: ReplyInsightsSnapshot;
  activeAbTest: AbTestSummary | null;
  campaignHealth: Array<{
    id: string;
    name: string;
    sendProgress: number;
    sentCount: number;
    replyRate: number;
    failedCount: number;
    createdAt: Date | string;
  }>;
}

export interface DashboardSnapshot {
  resume: ResumeRecord | null;
  recruiters: RecruiterSummary[];
  campaigns: CampaignListItem[];
  accounts: AccountSummary[];
  analytics: AnalyticsSnapshot;
  overview: OutreachOverview;
  timeSuggestion: SendTimeSuggestion;
  jobOsSettings: JobOsSettings;
  activeAtsAnalysis: StoredAtsAnalysis | null;
  replyInsights: ReplyInsightsSnapshot;
  activeAbTest: AbTestSummary | null;
  assistantMessages: AssistantMessageSummary[];
  recentReplyAnalyses: ReplyAnalysisSummary[];
  selectedCampaign: CampaignDetail | null;
}
