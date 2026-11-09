import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GlobalRole } from '@omp/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: any,
    @Query('teamId') teamId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statsService.overview(user, {
      teamId: teamId ? Number(teamId) : undefined,
      from,
      to,
    });
  }

  @Get('export')
  @Roles(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)
  async export(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('teamId') teamId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buf = await this.statsService.exportExcel(user, {
      teamId: teamId ? Number(teamId) : undefined,
      from,
      to,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="omp-report.xlsx"');
    res.send(buf);
  }
}
