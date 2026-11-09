import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PunchService } from './punch.service';
import { CreatePunchDto } from './dto/create-punch.dto';

@Controller('punches')
@UseGuards(JwtAuthGuard)
export class PunchController {
  constructor(private readonly punchService: PunchService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePunchDto) {
    return this.punchService.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.punchService.list(user, {
      teamId: teamId ? Number(teamId) : undefined,
      userId: userId ? Number(userId) : undefined,
      date,
      from,
      to,
    });
  }

  @Get('feed/today')
  feedToday(@CurrentUser() user: any, @Query('teamId') teamId?: string) {
    return this.punchService.feedToday(
      user,
      teamId ? Number(teamId) : undefined,
    );
  }

  @Get('folders')
  folders(@CurrentUser() user: any, @Query('teamId') teamId?: string) {
    return this.punchService.folders(user, teamId ? Number(teamId) : undefined);
  }

  @Get('route')
  route(
    @CurrentUser() user: any,
    @Query('userId') userId: string,
    @Query('date') date: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.punchService.route(user, {
      teamId: teamId ? Number(teamId) : undefined,
      userId: Number(userId),
      date,
    });
  }

  @Get('latest')
  latest(@CurrentUser() user: any, @Query('teamId') teamId?: string) {
    return this.punchService.latestPositions(
      user,
      teamId ? Number(teamId) : undefined,
    );
  }

  @Get('download')
  async download(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
  ) {
    const file = await this.punchService.downloadZip(user, {
      teamId: teamId ? Number(teamId) : undefined,
      userId: userId ? Number(userId) : undefined,
      date,
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="photos.zip"');
    return file;
  }
}
