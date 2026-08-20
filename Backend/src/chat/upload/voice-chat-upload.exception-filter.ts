import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class VoiceChatUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(exception);
    const status = httpException.getStatus();
    const body = httpException.getResponse();

    response.status(status).json(body);
  }

  private toHttpException(exception: MulterError): HttpException {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      return new HttpException(
        {
          success: false,
          message: 'Audio file is too large.',
        },
        400,
      );
    }

    return new HttpException(
      {
        success: false,
        message: 'Audio file is required.',
      },
      400,
    );
  }
}
