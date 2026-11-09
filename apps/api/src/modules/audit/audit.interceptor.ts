import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req || !WRITE_METHODS.has(String(req.method || '').toUpperCase())) {
      return next.handle();
    }

    const path = String(req.route?.path || req.url || '');
    // 跳过高频/敏感噪声
    if (
      path.includes('auth/login') ||
      path.includes('auth/sms/send') ||
      path.includes('files/upload') ||
      path.includes('geo/')
    ) {
      return next.handle();
    }

    const user = req.user;
    const method = String(req.method).toUpperCase();
    const resource = this.guessResource(path);
    const resourceId = req.params?.id || req.body?.id || null;

    return next.handle().pipe(
      tap({
        next: (data) => {
          void this.audit
            .log({
              actorId: user?.id,
              actorName: user?.displayName || user?.username,
              action: method,
              resource,
              resourceId,
              detail: {
                url: req.originalUrl || req.url,
                bodyKeys: req.body ? Object.keys(req.body) : [],
                resultId: data?.id,
                audit: data?._audit,
              },
              ip: req.ip || req.headers?.['x-forwarded-for'] || null,
              teamId: user?.currentTeamId ?? req.body?.teamId ?? null,
            })
            .catch(() => undefined);
        },
      }),
    );
  }

  private guessResource(path: string) {
    if (path.includes('work-orders')) return 'work-order';
    if (path.includes('templates')) return 'template';
    if (path.includes('punches')) return 'punch';
    if (path.includes('teams')) return 'team';
    if (path.includes('users')) return 'user';
    if (path.includes('auth')) return 'auth';
    return 'api';
  }
}
