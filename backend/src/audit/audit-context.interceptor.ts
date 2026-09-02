import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';

/** Propaga request_id/IP/user-agent para os registros de auditoria (RN-015). */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    return new Observable((subscriber) => {
      AuditService.context.run(
        {
          requestId: (req.headers['x-request-id'] as string) ?? randomUUID(),
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        },
        () => next.handle().subscribe(subscriber),
      );
    });
  }
}
