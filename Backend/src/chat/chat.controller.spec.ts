import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

describe('ChatController', () => {
  let app: INestApplication;
  const conversationId = '507f1f77bcf86cd799439011';

  const chatService = {
    createConversation: jest.fn(),
    getConversations: jest.fn(),
    getConversationHistory: jest.fn(),
    deleteConversation: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatService,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ userId: 'user-1' }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires JWT authentication for chat endpoints', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .send({ conversationId, message: 'Hello' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/chat/conversations')
      .expect(401);

    await request(app.getHttpServer()).get('/chat/conversations').expect(401);
  });

  it('creates a conversation for authenticated users', async () => {
    chatService.createConversation.mockResolvedValue({
      success: true,
      conversation: { _id: conversationId, title: 'New Conversation' },
    });

    const response = await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(chatService.createConversation).toHaveBeenCalledWith('user-1');
    expect(response.body.success).toBe(true);
  });

  it('rejects chat requests without conversationId', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: 'What is paracetamol?' })
      .expect(400);
  });

  it('rejects empty messages with validation error', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId, message: '   ' })
      .expect(400);
  });

  it('rejects invalid conversationId values', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId: 'invalid-id', message: 'Hello' })
      .expect(400);
  });

  it('sends a message for authenticated requests', async () => {
    chatService.sendMessage.mockResolvedValue({
      success: true,
      message: 'Paracetamol is used for pain and fever.',
      provider: 'gemini',
      conversationId,
    });

    const response = await request(app.getHttpServer())
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ conversationId, message: 'What is paracetamol?' })
      .expect(200);

    expect(chatService.sendMessage).toHaveBeenCalledWith(
      'user-1',
      conversationId,
      'What is paracetamol?',
    );
    expect(response.body).toEqual({
      success: true,
      message: 'Paracetamol is used for pain and fever.',
      provider: 'gemini',
      conversationId,
    });
  });

  it('returns conversation history', async () => {
    chatService.getConversationHistory.mockResolvedValue({
      success: true,
      conversation: {
        _id: conversationId,
        title: 'Dolo 650 Usage',
        messages: [
          { role: 'user', content: 'What is Dolo 650?', createdAt: new Date() },
        ],
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/chat/conversations/${conversationId}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(chatService.getConversationHistory).toHaveBeenCalledWith(
      'user-1',
      conversationId,
    );
    expect(response.body.success).toBe(true);
  });

  it('lists conversations for the authenticated user', async () => {
    chatService.getConversations.mockResolvedValue({
      success: true,
      conversations: [{ _id: conversationId, title: 'Dolo 650 Usage' }],
    });

    const response = await request(app.getHttpServer())
      .get('/chat/conversations')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(chatService.getConversations).toHaveBeenCalledWith('user-1');
    expect(response.body.conversations).toHaveLength(1);
  });

  it('deletes a conversation', async () => {
    chatService.deleteConversation.mockResolvedValue({ success: true });

    const response = await request(app.getHttpServer())
      .delete(`/chat/conversations/${conversationId}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(chatService.deleteConversation).toHaveBeenCalledWith(
      'user-1',
      conversationId,
    );
    expect(response.body).toEqual({ success: true });
  });

  it('uses JwtAuthGuard on the controller', () => {
    const guards = Reflect.getMetadata('__guards__', ChatController);
    expect(guards).toContain(JwtAuthGuard);
  });
});
