import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '@omp/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const codes: GlobalRole[] = (user?.roles || []).map((r: { code: GlobalRole }) => r.code);
    if (codes.includes(GlobalRole.SUPER_ADMIN)) return true;
    const ok = required.some((role) => codes.includes(role));
    if (!ok) throw new ForbiddenException('权限不足');
    return true;
  }
}
