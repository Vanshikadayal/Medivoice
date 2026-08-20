import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

export const MEDICINE_SCANNER_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'medicine-scanner',
);

export const MEDICINE_SCANNER_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function ensureUploadDir() {
  if (!existsSync(MEDICINE_SCANNER_UPLOAD_DIR)) {
    mkdirSync(MEDICINE_SCANNER_UPLOAD_DIR, { recursive: true });
  }
}

export const medicineScannerUploadOptions = {
  storage: diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void,
    ) => {
      ensureUploadDir();
      callback(null, MEDICINE_SCANNER_UPLOAD_DIR);
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const extension =
        ALLOWED_MIME_TYPES[file.mimetype] ??
        extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      callback(
        new BadRequestException(
          'Unsupported file type. Upload a jpg, jpeg, png, or webp image.',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
  limits: {
    files: 1,
    fileSize: MEDICINE_SCANNER_MAX_FILE_SIZE_BYTES,
  },
};
