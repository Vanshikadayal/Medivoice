import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, statSync } from 'fs';
import { diskStorage } from 'multer';
import { basename, extname, isAbsolute, join, resolve, sep } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

export const PRESCRIPTION_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'prescriptions',
);

export const PRESCRIPTION_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function ensureUploadDir() {
  if (!existsSync(PRESCRIPTION_UPLOAD_DIR)) {
    mkdirSync(PRESCRIPTION_UPLOAD_DIR, { recursive: true });
  }
}

export function getPrescriptionImageUrl(filename: string) {
  return `uploads/prescriptions/${filename}`;
}

export function resolvePrescriptionImagePath(imageUrl: string): string {
  if (!imageUrl?.trim()) {
    throw new NotFoundException('Prescription image file is missing');
  }

  const storedPath = imageUrl.trim().replace(/^file:\/\//, '');
  const relativeOrAbsolute = isAbsolute(storedPath)
    ? storedPath
    : storedPath.includes('/')
      ? storedPath
      : join('uploads', 'prescriptions', basename(storedPath));

  const resolved = resolve(process.cwd(), relativeOrAbsolute);
  const uploadRoot = resolve(PRESCRIPTION_UPLOAD_DIR);

  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${sep}`)) {
    throw new BadRequestException('Invalid prescription image path');
  }

  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new NotFoundException('Prescription image file is missing');
  }

  return resolved;
}

export const prescriptionUploadOptions = {
  storage: diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void,
    ) => {
      ensureUploadDir();
      callback(null, PRESCRIPTION_UPLOAD_DIR);
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const extension = ALLOWED_MIME_TYPES[file.mimetype] ?? extname(file.originalname).toLowerCase();
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
    fileSize: PRESCRIPTION_MAX_FILE_SIZE_BYTES,
  },
};
