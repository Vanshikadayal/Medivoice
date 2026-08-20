export type ChatResponse = {
  success: boolean;
  message: string;
  provider?: string;
  conversationId?: string;
  safetyLevel?: 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'EMERGENCY';
};
