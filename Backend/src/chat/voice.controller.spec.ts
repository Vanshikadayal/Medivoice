import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { VoiceController } from './voice.controller';
import { VoiceChatService } from './services/voice-chat.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

describe('VoiceController', () => {
  let app: INestApplication;
  const conversationId = '507f1f77bcf86cd799439011';

  const voiceChatService = {
    processVoiceMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceController],
      providers: [
        {
          provide: VoiceChatService,
          useValue: voiceChatService,
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

  it('requires JWT authentication', async () => {
    await request(app.getHttpServer())
      .post('/chat/voice')
      .field('conversationId', conversationId)
      .attach('audio', Buffer.from('audio'), {
        filename: 'voice.webm',
        contentType: 'audio/webm',
      })
      .expect(401);
  });

  it('rejects unsupported audio format', async () => {
    await request(app.getHttpServer())
      .post('/chat/voice')
      .set('Authorization', 'Bearer valid-token')
      .field('conversationId', conversationId)
      .attach('audio', Buffer.from('audio'), {
        filename: 'voice.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rejects missing conversationId', async () => {
    await request(app.getHttpServer())
      .post('/chat/voice')
      .set('Authorization', 'Bearer valid-token')
      .attach('audio', Buffer.from('audio'), {
        filename: 'voice.webm',
        contentType: 'audio/webm',
      })
      .expect(400);
  });

  it('processes a valid voice request', async () => {
    voiceChatService.processVoiceMessage.mockResolvedValue({
      success: true,
      conversationId,
      transcript: 'What is Dolo 650 used for?',
      message: 'Dolo 650 contains paracetamol.',
      safetyLevel: 'SAFE',
      audio: {
        mimeType: 'audio/wav',
        data: Buffer.from('wav').toString('base64'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/chat/voice')
      .set('Authorization', 'Bearer valid-token')
      .field('conversationId', conversationId)
      .attach('audio', Buffer.from('audio'), {
        filename: 'voice.webm',
        contentType: 'audio/webm',
      })
      .expect(200);

    expect(voiceChatService.processVoiceMessage).toHaveBeenCalledWith(
      'user-1',
      conversationId,
      expect.objectContaining({
        mimetype: 'audio/webm',
      }),
    );
    expect(response.body.success).toBe(true);
    expect(response.body.transcript).toBe('What is Dolo 650 used for?');
  });

  it('uses JwtAuthGuard on the controller', () => {
    const guards = Reflect.getMetadata('__guards__', VoiceController);
    expect(guards).toContain(JwtAuthGuard);
  });
});
