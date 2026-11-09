import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@omp/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('resource') resource?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.audit.list({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      resource,
      actorId: actorId ? Number(actorId) : undefined,
    });
  }
}
