import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Centralized logging
    this.logger.error('Exception caught', {
      url: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      error: exception instanceof Error ? exception.stack : exception,
    });

    // Determine status code
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine error message
    let message: string;
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as { message?: string }).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Internal server error';
    }

    // For HTML routes (journeys), render error page
    if (request.url.startsWith('/nest-journey') || request.url.startsWith('/respond-to-claim')) {
      response.status(status).render('error.njk', {
        statusCode: status,
        message,
        backUrl: '/dashboard',
      });
      return;
    }

    // For API routes, return JSON
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
