import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ChatService } from './chat.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import {
  Conversation,
  DEFAULT_CONVERSATION_TITLE,
} from './schemas/conversation.schema';
import { ChatMessage } from './schemas/chat-message.schema';
import { MedicineRetrievalService } from './services/medicine-retrieval.service';
import { MedicalQueryClassifierService } from './services/medical-query-classifier.service';
import { MedicalSafetyService } from './services/medical-safety.service';
import { EMERGENCY_RESPONSE_MESSAGE } from './services/medical-safety.service';

describe('ChatService', () => {
  let service: ChatService;

  const userId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const conversationId = new Types.ObjectId();

  const aiProvider = {
    providerId: 'gemini',
    generateResponse: jest.fn(),
  };

  const conversationDoc = {
    _id: conversationId,
    userId: new Types.ObjectId(userId),
    title: DEFAULT_CONVERSATION_TITLE,
    save: jest.fn().mockResolvedValue(undefined),
  };

  const conversationModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(),
  };

  const chatMessageModel = {
    create: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'chat.maxHistoryMessages') {
        return 20;
      }
      return undefined;
    }),
  };

  const medicineRetrievalService = {
    retrieveForMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        MedicalQueryClassifierService,
        MedicalSafetyService,
        { provide: AI_PROVIDER, useValue: aiProvider },
        { provide: getModelToken(Conversation.name), useValue: conversationModel },
        { provide: getModelToken(ChatMessage.name), useValue: chatMessageModel },
        { provide: ConfigService, useValue: configService },
        {
          provide: MedicineRetrievalService,
          useValue: medicineRetrievalService,
        },
      ],
    }).compile();

    service = module.get(ChatService);
    jest.clearAllMocks();
    medicineRetrievalService.retrieveForMessage.mockImplementation(
      async (message: string) => ({
        prompt: message,
        medicineFound: false,
      }),
    );
    conversationDoc.save.mockResolvedValue(undefined);
    conversationDoc.title = DEFAULT_CONVERSATION_TITLE;
    conversationDoc.userId = new Types.ObjectId(userId);
  });

  describe('createConversation', () => {
    it('creates a conversation for the authenticated user', async () => {
      const created = {
        _id: conversationId,
        title: DEFAULT_CONVERSATION_TITLE,
      };
      conversationModel.create.mockResolvedValue(created);

      const result = await service.createConversation(userId);

      expect(conversationModel.create).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
        title: DEFAULT_CONVERSATION_TITLE,
      });
      expect(result).toEqual({
        success: true,
        conversation: {
          _id: conversationId,
          title: DEFAULT_CONVERSATION_TITLE,
        },
      });
    });
  });

  describe('getConversations', () => {
    it('returns conversations sorted by updatedAt desc', async () => {
      const leanExec = jest.fn().mockResolvedValue([
        { _id: conversationId, title: 'Dolo 650 Usage', updatedAt: new Date() },
      ]);
      conversationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: leanExec }),
          }),
        }),
      });

      const result = await service.getConversations(userId);

      expect(conversationModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });
      expect(result.success).toBe(true);
      expect(result.conversations).toHaveLength(1);
    });
  });

  describe('getConversationHistory', () => {
    it('returns conversation messages for the owner', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      const leanExec = jest.fn().mockResolvedValue([
        { role: 'user', content: 'What is Dolo 650?', createdAt: new Date() },
        {
          role: 'assistant',
          content: 'Dolo 650 contains paracetamol.',
          createdAt: new Date(),
        },
      ]);
      chatMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({ exec: leanExec }),
          }),
        }),
      });

      const result = await service.getConversationHistory(
        userId,
        conversationId.toString(),
      );

      expect(result.success).toBe(true);
      expect(result.conversation.messages).toHaveLength(2);
    });

    it('throws when conversation belongs to another user', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        service.getConversationHistory(userId, conversationId.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws for invalid conversationId', async () => {
      await expect(
        service.getConversationHistory(userId, 'invalid-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation and associated messages', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      chatMessageModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
      conversationModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteConversation(
        userId,
        conversationId.toString(),
      );

      expect(chatMessageModel.deleteMany).toHaveBeenCalledWith({
        conversationId: conversationDoc._id,
      });
      expect(conversationModel.deleteOne).toHaveBeenCalledWith({
        _id: conversationDoc._id,
      });
      expect(result).toEqual({ success: true });
    });

    it('cannot delete another user conversation', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        service.deleteConversation(userId, conversationId.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    function mockHistoryMessages(messages: Array<{ role: string; content: string }>) {
      const leanExec = jest.fn().mockResolvedValue(messages);
      chatMessageModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({ exec: leanExec }),
            }),
          }),
        }),
      });
    }

    it('uses medicine retrieval and safety-aware prompting before calling Gemini', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      mockHistoryMessages([]);
      medicineRetrievalService.retrieveForMessage.mockResolvedValue({
        prompt: 'unused',
        medicineFound: true,
        medicine: {
          found: true,
          name: 'Dolo 650 Tablet',
          source: 'indian-medicine-dataset',
          sourceUrl: null,
        },
      });
      aiProvider.generateResponse.mockResolvedValue('Dolo 650 contains paracetamol.');

      await service.sendMessage(
        userId,
        conversationId.toString(),
        'What is Dolo 650?',
      );

      expect(medicineRetrievalService.retrieveForMessage).toHaveBeenCalledWith(
        'What is Dolo 650?',
        'MEDICINE_INFORMATION',
      );
      expect(aiProvider.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('MEDICAL SAFETY RULES:'),
        [],
      );
      expect(aiProvider.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Trusted Indian medicine database record:'),
        [],
      );
    });

    it('returns a controlled emergency response without calling Gemini', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      mockHistoryMessages([]);

      const result = await service.sendMessage(
        userId,
        conversationId.toString(),
        "I can't breathe and my throat is swelling.",
      );

      expect(aiProvider.generateResponse).not.toHaveBeenCalled();
      expect(medicineRetrievalService.retrieveForMessage).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: EMERGENCY_RESPONSE_MESSAGE,
        provider: 'gemini',
        conversationId: conversationId.toString(),
        safetyLevel: 'EMERGENCY',
      });
    });

    it('saves user and assistant messages and returns AI response', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      mockHistoryMessages([]);
      aiProvider.generateResponse.mockResolvedValue(
        'Dolo 650 contains paracetamol.',
      );

      const result = await service.sendMessage(
        userId,
        conversationId.toString(),
        'What is Dolo 650?',
      );

      expect(chatMessageModel.create).toHaveBeenCalledTimes(2);
      expect(chatMessageModel.create).toHaveBeenNthCalledWith(1, {
        conversationId: conversationDoc._id,
        userId: new Types.ObjectId(userId),
        role: 'user',
        content: 'What is Dolo 650?',
      });
      expect(chatMessageModel.create).toHaveBeenNthCalledWith(2, {
        conversationId: conversationDoc._id,
        userId: new Types.ObjectId(userId),
        role: 'assistant',
        content: 'Dolo 650 contains paracetamol.',
      });
      expect(aiProvider.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('User question: What is Dolo 650?'),
        [],
      );
      expect(result).toEqual({
        success: true,
        message: 'Dolo 650 contains paracetamol.',
        provider: 'gemini',
        conversationId: conversationId.toString(),
        safetyLevel: 'SAFE',
      });
    });

    it('passes conversation history to the AI provider', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        title: 'Dolo 650 Usage',
      });
      mockHistoryMessages([
        { role: 'assistant', content: 'Dolo 650 contains paracetamol.' },
        { role: 'user', content: 'What is Dolo 650?' },
      ]);
      aiProvider.generateResponse.mockResolvedValue(
        'It is used for pain and fever relief.',
      );

      await service.sendMessage(
        userId,
        conversationId.toString(),
        'What is it used for?',
      );

      expect(aiProvider.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('User question: What is it used for?'),
        [
          { role: 'user', content: 'What is Dolo 650?' },
          { role: 'assistant', content: 'Dolo 650 contains paracetamol.' },
        ],
      );
    });

    it('respects the maximum history limit', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        title: 'Existing',
      });
      const history = Array.from({ length: 25 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message-${index}`,
      }));
      mockHistoryMessages(history);
      aiProvider.generateResponse.mockResolvedValue('response');

      await service.sendMessage(userId, conversationId.toString(), 'latest');

      const findChain = chatMessageModel.find.mock.results[0].value;
      expect(findChain.sort().limit).toHaveBeenCalledWith(20);
    });

    it('generates a title from the first user message', async () => {
      conversationModel.findById.mockResolvedValue(conversationDoc);
      mockHistoryMessages([]);
      aiProvider.generateResponse.mockResolvedValue('answer');

      await service.sendMessage(
        userId,
        conversationId.toString(),
        'What is Dolo 650 used for?',
      );

      expect(conversationDoc.title).toBe('Dolo 650 used for');
      expect(conversationDoc.save).toHaveBeenCalled();
    });

    it('throws for invalid conversationId', async () => {
      await expect(
        service.sendMessage(userId, 'invalid-id', 'Hello'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when conversation belongs to another user', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        service.sendMessage(userId, conversationId.toString(), 'Hello'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a safe failure response when AI fails after saving user message', async () => {
      conversationModel.findById.mockResolvedValue({
        ...conversationDoc,
        title: 'Existing',
      });
      mockHistoryMessages([]);
      aiProvider.generateResponse.mockRejectedValue(new Error('Gemini down'));

      const result = await service.sendMessage(
        userId,
        conversationId.toString(),
        'What is paracetamol?',
      );

      expect(chatMessageModel.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        message: 'Unable to generate a response right now.',
        conversationId: conversationId.toString(),
      });
    });
  });
});
