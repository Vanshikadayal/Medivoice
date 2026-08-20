import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { AI_PROVIDER, type AIProvider } from './providers/ai-provider.interface';
import { ChatResponse } from './types/chat-response';
import {
  Conversation,
  DEFAULT_CONVERSATION_TITLE,
} from './schemas/conversation.schema';
import { ChatMessage } from './schemas/chat-message.schema';
import { ConversationTurn } from './types/conversation-context';
import { generateConversationTitle } from './utils/conversation-title.util';
import { MedicineRetrievalService } from './services/medicine-retrieval.service';
import { MedicalQueryClassifierService } from './services/medical-query-classifier.service';
import { MedicalSafetyService } from './services/medical-safety.service';
import { buildSafetyAwarePrompt } from './utils/medical-safety-prompt.util';
import { MedicalQueryCategory } from './types/medical-safety';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AIProvider,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessage>,
    private readonly configService: ConfigService,
    private readonly medicineRetrievalService: MedicineRetrievalService,
    private readonly medicalQueryClassifierService: MedicalQueryClassifierService,
    private readonly medicalSafetyService: MedicalSafetyService,
  ) {}

  async createConversation(userId: string) {
    const conversation = await this.conversationModel.create({
      userId: new Types.ObjectId(userId),
      title: DEFAULT_CONVERSATION_TITLE,
    });

    return {
      success: true,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
      },
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .select('_id title updatedAt')
      .lean()
      .exec();

    return {
      success: true,
      conversations,
    };
  }

  async getConversationHistory(userId: string, conversationId: string) {
    const conversation = await this.getOwnedConversation(
      userId,
      conversationId,
    );

    const messages = await this.chatMessageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .select('role content createdAt')
      .lean()
      .exec();

    return {
      success: true,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        messages,
      },
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.getOwnedConversation(
      userId,
      conversationId,
    );

    await this.chatMessageModel.deleteMany({
      conversationId: conversation._id,
    });
    await this.conversationModel.deleteOne({ _id: conversation._id });

    return {
      success: true,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    message: string,
  ): Promise<ChatResponse> {
    const conversation = await this.getOwnedConversation(
      userId,
      conversationId,
    );
    const history = await this.loadConversationHistory(conversation._id);

    await this.chatMessageModel.create({
      conversationId: conversation._id,
      userId: new Types.ObjectId(userId),
      role: 'user',
      content: message,
    });

    if (conversation.title === DEFAULT_CONVERSATION_TITLE) {
      conversation.title = generateConversationTitle(message);
      await conversation.save();
    } else {
      conversation.updatedAt = new Date();
      await conversation.save();
    }

    try {
      const category = this.medicalQueryClassifierService.classify(message);

      if (category === MedicalQueryCategory.EMERGENCY) {
        const emergencyResponse =
          this.medicalSafetyService.buildEmergencyResponse();
        return this.saveAssistantResponse(
          conversation,
          userId,
          emergencyResponse,
          'EMERGENCY',
        );
      }

      const retrieval = await this.medicineRetrievalService.retrieveForMessage(
        message,
        category,
      );
      const safetyDecision = this.medicalSafetyService.evaluate({
        message,
        category,
        medicineFound: retrieval.medicineFound,
      });
      const prompt = buildSafetyAwarePrompt({
        message,
        retrieval,
        decision: safetyDecision,
      });
      const response = await this.aiProvider.generateResponse(prompt, history);

      return this.saveAssistantResponse(
        conversation,
        userId,
        response,
        safetyDecision.level,
      );
    } catch (error) {
      this.logger.error(
        'Chat response generation failed',
        error instanceof Error ? error.message : undefined,
      );

      conversation.updatedAt = new Date();
      await conversation.save();

      return {
        success: false,
        message: 'Unable to generate a response right now.',
        conversationId: conversation._id.toString(),
      };
    }
  }

  private async saveAssistantResponse(
    conversation: Conversation,
    userId: string,
    response: string,
    safetyLevel: ChatResponse['safetyLevel'],
  ): Promise<ChatResponse> {
    await this.chatMessageModel.create({
      conversationId: conversation._id,
      userId: new Types.ObjectId(userId),
      role: 'assistant',
      content: response,
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    return {
      success: true,
      message: response,
      provider: this.aiProvider.providerId,
      conversationId: conversation._id.toString(),
      safetyLevel,
    };
  }

  private async loadConversationHistory(
    conversationId: Types.ObjectId,
  ): Promise<ConversationTurn[]> {
    const maxHistory =
      this.configService.get<number>('chat.maxHistoryMessages') ?? 20;

    const messages = await this.chatMessageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(maxHistory)
      .select('role content')
      .lean()
      .exec();

    return messages
      .reverse()
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));
  }

  private async getOwnedConversation(userId: string, conversationId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversationId');
    }

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation || conversation.userId.toString() !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
