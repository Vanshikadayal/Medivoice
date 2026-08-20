import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { PRESCRIPTION_MAX_FILE_SIZE_BYTES } from './prescription-upload.options';

@Catch(MulterError)
export class PrescriptionUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const httpException = this.toHttpException(exception);

    response.status(httpException.getStatus()).json(httpException.getResponse());
  }

  private toHttpException(exception: MulterError): HttpException {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      const maxMb = PRESCRIPTION_MAX_FILE_SIZE_BYTES / (1024 * 1024);
      return new PayloadTooLargeException(
        `Image must be ${maxMb}MB or smaller`,
      );
    }

    if (
      exception.code === 'LIMIT_FILE_COUNT' ||
      exception.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      return new BadRequestException(
        'Upload exactly one image using the form field "image"',
      );
    }

    return new BadRequestException('Invalid image upload');
  }
}
