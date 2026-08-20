import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Request } from 'express';

export const VOICE_CHAT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const VOICE_CHAT_ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
]);

export const voiceChatUploadOptions = {
  storage: memoryStorage(),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!VOICE_CHAT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException({
          success: false,
          message: 'Unsupported audio format.',
        }),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    files: 1,
    fileSize: VOICE_CHAT_MAX_FILE_SIZE_BYTES,
  },
};
