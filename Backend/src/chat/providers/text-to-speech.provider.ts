import { SynthesizedSpeech } from '../types/synthesized-speech';

export const TEXT_TO_SPEECH_PROVIDER = 'TEXT_TO_SPEECH_PROVIDER';

export interface TextToSpeechProvider {
  readonly providerId: string;
  synthesize(text: string): Promise<SynthesizedSpeech>;
}
