import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Anything thrown outside the typed refusals in errors.ts would otherwise leave Nest to
// answer with a bare "Internal server error", which tells a caller nothing and hides the
// cause from the log. FR-078 requires a message that identifies the problem, so the
// catch-all is part of the error contract rather than a nicety.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Unhandled');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ method: string; originalUrl: string }>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error.stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'UNEXPECTED_FAILURE',
        message:
          process.env.NODE_ENV === 'production'
            ? 'The request could not be completed. The failure has been logged.'
            : `${error.name}: ${error.message}`,
        ...(process.env.NODE_ENV === 'production' ? {} : { stack: error.stack?.split('\n') }),
      },
    });
  }
}
