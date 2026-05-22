export enum CaseCategory {
  REPAIRS = 'REPAIRS',
  DEPOSIT_RETURN = 'DEPOSIT_RETURN',
  RENT_INCREASE = 'RENT_INCREASE',
  NOISE = 'NOISE',
  EXPENSES = 'EXPENSES',
  EARLY_TERMINATION = 'EARLY_TERMINATION',
  OTHER = 'OTHER',
}

export enum CaseStatus {
  OPENED = 'OPENED',
  WAITING_RESPONSE = 'WAITING_RESPONSE',
  BOTH_STATED = 'BOTH_STATED',
  AI_ANALYZING = 'AI_ANALYZING',
  PROPOSAL_READY = 'PROPOSAL_READY',
  ACCEPTED = 'ACCEPTED',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface CasePublic {
  id: string;
  contractId: string;
  openedById: string;
  category: CaseCategory;
  status: CaseStatus;
  summary: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ProposalPublic {
  id: string;
  caseId: string;
  legalFramework: string;
  analysis: string;
  suggestion: string;
  commitments: string[];
  deadlineDays: number;
  createdAt: string;
}
