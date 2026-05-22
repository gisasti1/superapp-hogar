export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

export const KYC_FACIAL_MATCH_THRESHOLD = 0.85;

export const RENT_DUE_DAY = 10;
export const RENT_GRACE_DAYS = 5;
export const DEPOSIT_MONTHS = 1;

export const MEDIATION_RESPONSE_HOURS = 72;
export const MEDIATION_HUMAN_COST_USD = 49;

export const MARKETPLACE_COMMISSION_RATE = 0.15;

export const SUBSCRIPTION_PRICE_USD = 5;

export const SUPPORTED_CURRENCIES = ['ARS', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
