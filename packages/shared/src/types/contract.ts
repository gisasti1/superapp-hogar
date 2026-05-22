export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURES = 'PENDING_SIGNATURES',
  SIGNED = 'SIGNED',
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

export interface ContractPublic {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  currency: 'ARS' | 'USD';
  depositAmount: number;
  status: ContractStatus;
  signedAt?: string;
  pdfUrl?: string;
}
