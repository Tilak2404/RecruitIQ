export interface CompanyResearchResult {
  overview: string;
  key_products: string[];
  culture: string;
  hiring_focus: string;
  tech_stack: string[];
  recent_signals: string;
  keywords: string[];
  outreach_angle: string;
}

export type JobTargetPersona = 'STARTUP' | 'BIG_TECH' | 'HR_RECRUITER' | 'HIRING_MANAGER';

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
}

export interface StoredAtsAnalysis extends AtsAnalysisResult {
  id: string;
  jobDescription: string;
  resumeText: string;
  useForOutreach: boolean;
  createdAt: Date;
}

export interface ReplyAnalysisSummary {
  id: string;
  sentiment: string;
  intent: string;
  summary: string;
  suggestedReply: string;
  suggestedNextStep: string;
  confidence: number;
  reply_type: "interested" | "reject" | "ghosting" | "neutral";
  recruiter: { name: string; company: string } | null;
  createdAt: Date;
}

export interface ReplyInsightsSnapshot {
  summary: string;
  weakPatterns: string[];
  recommendations: string[];
}

export interface AnalyticsSnapshot {
  responseRate: number;
  openRate: number;
  personalInsights: {
    averageReplyProbability: number;
  };
  replyInsights: ReplyInsightsSnapshot;
}

export interface CampaignDetail {
  id: string;
  emailLogs: Array<{
    id: string;
    recruiterId: string;
    recruiter: { name: string; company: string };
  }>;
}

