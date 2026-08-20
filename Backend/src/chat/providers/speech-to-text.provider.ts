import { SpeechTranscript } from '../types/speech-transcript';

export const SPEECH_TO_TEXT_PROVIDER = 'SPEECH_TO_TEXT_PROVIDER';

export interface SpeechToTextProvider {
  readonly providerId: string;
  transcribe(audio: Express.Multer.File): Promise<SpeechTranscript>;
}
