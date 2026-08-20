import { ChatResponse } from './chat-response';

export type VoiceChatAudioPayload = {
  mimeType: string;
  data: string;
};

export type VoiceChatResponse = {
  success: boolean;
  message?: string;
  conversationId?: string;
  transcript?: string;
  safetyLevel?: ChatResponse['safetyLevel'];
  provider?: string;
  audio?: VoiceChatAudioPayload | null;
  audioError?: string;
};
