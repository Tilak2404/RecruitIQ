import { Prisma } from "@prisma/client";

export type JobTargetPersona = "STARTUP" | "BIG_TECH" | "HR_RECRUITER" | "HIRING_MANAGER";

export type RecruiterTone = "FORMAL" | "BALANCED" | "CASUAL";
export type RecruiterAudience = "TECHNICAL" | "HR" | "HIRING_MANAGER";

export interface JobOsSettings {
  persona: JobTargetPersona;
}

export interface RecruiterPersonalityProfile {
  tone: RecruiterTone;
  audience: RecruiterAudience;
  rationale: string;
}

export interface EmailQualityScore {
  score: number;
  personalizationScore: number;
  clarityScore: number;
  lengthScore: number;
  ctaStrengthScore: number;
  reasons: string[];
  suggestions: string[];
  recruiterPersonality: RecruiterPersonalityProfile;
}

export interface ReplyInsightsSnapshot {
  summary: string;
  weakPatterns: string[];
  strengths: string[];
  recommendations: string[];
  responseRateDelta: number;
}

export interface PersonalInsightsSnapshot {
  totalEmailsSent: number;
  responseRate: number;
  bestPerformingMessage: string | null;
  bestTimeToSend: string;
  averageReplyProbability: number;
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
  createdAt: Date;
  winner: "A" | "B" | "TIE";
  variants: [AbTestVariantSummary, AbTestVariantSummary];
}

export interface CompanyResearchResult {
  company: string;
  overview: string;
  culture: string;
  hiring_focus: string;
  keywords: string[];
  outreach_angle: string;
}

export interface PortfolioGenerationResult {
  headline: string;
  summary: string;
  projectDescriptions: string[];
  githubAbout: string;
  portfolioSections: string[];
}

export type CampaignDetail = Prisma.CampaignGetPayload<{
  include: {
    emailLogs: {
      include: {
        recruiter: true;
        sendingAccount: {
          select: {
            id: true;
            name: true;
            email: true;
            type: true;
            isActive: true;
          };
        };
      };
      orderBy: {
        createdAt: "asc";
      };
    };
  };
}>;

export type AccountSummary = Prisma.SendingAccountGetPayload<{
  select: {
    id: true;
    name: true;
    type: true;
    fromName: true;
    email: true;
    smtpHost: true;
    smtpPort: true;
    smtpSecure: true;
    dailyLimit: true;
    hourlyLimit: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export type AssistantMessageSummary = Prisma.AssistantMessageGetPayload<{
  select: {
    id: true;
    role: true;
    content: true;
    metadata: true;
    createdAt: true;
  };
}>;

export type ReplyAnalysisSummary = Prisma.ReplyAnalysisGetPayload<{
  include: {
    recruiter: {
      select: {
        id: true;
        name: true;
        company: true;
        email: true;
      };
    };
    emailLog: {
      select: {
        id: true;
        subject: true;
        status: true;
        updatedAt: true;
      };
    };
  };
}>;

export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sendState: string;
  sendProgress: number;
  createdAt: Date;
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
  campaignHealth: Array<{
    id: string;
    name: string;
    sendProgress: number;
    sentCount: number;
    replyRate: number;
    failedCount: number;
    createdAt: Date;
  }>;
  personalInsights: PersonalInsightsSnapshot;
  replyInsights: ReplyInsightsSnapshot;
  activeAbTest: AbTestSummary | null;
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

export interface DashboardSnapshot {
  resume: {
    id: string;
    candidateName: string;
    fileName: string;
    extractedText: string;
    createdAt: Date;
  } | null;
  recruiters: Array<{
    id: string;
    name: string;
    email: string;
    company: string;
    createdAt: Date;
  }>;
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

export type KeywordCategory = 'critical' | 'important' | 'optional';
export type ImprovementImpact = 'high' | 'medium' | 'low';
export type SectionName = 'Summary' | 'Skills' | 'Experience' | 'Projects' | 'Education' | 'Other';

export interface SectionAnalysis {
  name: SectionName;
  score: number;
  issues: string[];
  suggestions: Array<{
    id: string;
    original: string;
    improved: string;
    reason: string;
    impact: ImprovementImpact;
  }>;
}

export interface AdvancedAtsResult {
  personaTarget: JobTargetPersona;
  atsScore: number;
  keywordMatchPercentage: number;
  matchSummary: string;
  sections: SectionAnalysis[];
  keywordCategories: Record<KeywordCategory, string[]>;
  skillGaps: string[];
  suggestedSkillAdditions: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  bulletImprovements: Array<{
    id: string;
    section: SectionName;
    original: string;
    improved: string;
    reason: string;
    impact: ImprovementImpact;
  }>;
  roleDetected: string;
  metricsPresence: number;
  actionVerbsScore: number;
}

export type AtsAnalysisResult = AdvancedAtsResult;

export interface StoredAtsAnalysis extends AtsAnalysisResult {
  id: string;
  jobDescription: string;
  resumeText: string;
  useForOutreach: boolean;
  createdAt: Date;
}

