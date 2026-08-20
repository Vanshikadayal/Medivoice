import { ConversationTurn } from '../types/conversation-context';

export const AI_PROVIDER = 'AI_PROVIDER';

export interface AIProvider {
  readonly providerId: string;
  generateResponse(
    input: string,
    history?: ConversationTurn[],
  ): Promise<string>;
}
