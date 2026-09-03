import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Normaliza erros no formato problem+json descrito em docs/08-api-rest.md:
 * { statusCode, error, message, details? }
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const normalized =
        typeof body === 'string'
          ? { statusCode: status, error: exception.name, message: body }
          : { statusCode: status, error: exception.name, ...(body as object) };
      res.status(status).json(normalized);
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[unhandled]', exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Erro interno. O incidente foi registrado.',
    });
  }
}
