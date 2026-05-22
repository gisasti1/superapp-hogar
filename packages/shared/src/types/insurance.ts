export enum PolicyStatus {
  QUOTED = 'QUOTED',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  CLAIMED = 'CLAIMED',
}

export interface QuoteRequest {
  propertyAddress: string;
  city: string;
  monthlyRent: number;
  currency: 'ARS' | 'USD';
  contractMonths: number;
  tenantDni: string;
}

export interface QuoteOption {
  providerId: string;
  providerName: string;
  monthlyPremium: number;
  totalPremium: number;
  coverageAmount: number;
  coverageMonths: number;
  currency: 'ARS' | 'USD';
}

export interface PolicyPublic {
  id: string;
  quoteId: string;
  contractId: string;
  providerId: string;
  policyNumber: string;
  status: PolicyStatus;
  monthlyPremium: number;
  coverageAmount: number;
  startDate: string;
  endDate: string;
  pdfUrl?: string;
}
