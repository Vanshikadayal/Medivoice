import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineScannerModule } from 'src/medicine-scanner/medicine-scanner.module';
import { ChatController } from './chat.controller';
import { VoiceController } from './voice.controller';
import { VoiceUtilityController } from './voice-utility.controller';
import { ChatService } from './chat.service';
import { VoiceChatService } from './services/voice-chat.service';
import { VoiceUtilityService } from './services/voice-utility.service';
import { MedicineRetrievalService } from './services/medicine-retrieval.service';
import { MedicalQueryClassifierService } from './services/medical-query-classifier.service';
import { MedicalSafetyService } from './services/medical-safety.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { SPEECH_TO_TEXT_PROVIDER } from './providers/speech-to-text.provider';
import { TEXT_TO_SPEECH_PROVIDER } from './providers/text-to-speech.provider';
import { GeminiAiProvider } from './providers/gemini-ai.provider';
import { LocalWhisperSpeechToTextProvider } from './providers/local-whisper-speech-to-text.provider';
import { LocalPiperTextToSpeechProvider } from './providers/local-piper-text-to-speech.provider';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

@Module({
  imports: [
    MedicineScannerModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  controllers: [ChatController, VoiceController, VoiceUtilityController],
  providers: [
    ChatService,
    VoiceChatService,
    VoiceUtilityService,
    MedicineRetrievalService,
    MedicalQueryClassifierService,
    MedicalSafetyService,
    GeminiAiProvider,
    LocalWhisperSpeechToTextProvider,
    LocalPiperTextToSpeechProvider,
    {
      provide: AI_PROVIDER,
      useExisting: GeminiAiProvider,
    },
    {
      provide: SPEECH_TO_TEXT_PROVIDER,
      useExisting: LocalWhisperSpeechToTextProvider,
    },
    {
      provide: TEXT_TO_SPEECH_PROVIDER,
      useExisting: LocalPiperTextToSpeechProvider,
    },
  ],
})
export class ChatModule {}
