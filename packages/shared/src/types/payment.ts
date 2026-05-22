export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  OVERDUE = 'OVERDUE',
}

export enum PaymentType {
  RENT = 'RENT',
  INSURANCE_PREMIUM = 'INSURANCE_PREMIUM',
  DEPOSIT = 'DEPOSIT',
  SERVICE = 'SERVICE',
  MEDIATION_FEE = 'MEDIATION_FEE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export interface PaymentPublic {
  id: string;
  contractId?: string;
  payerId: string;
  receiverId?: string;
  amount: number;
  currency: 'ARS' | 'USD';
  type: PaymentType;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
  mpPaymentId?: string;
}
