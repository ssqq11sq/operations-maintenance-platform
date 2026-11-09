import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OvertimeService } from './overtime.service';
import {
  ApproveOvertimeDto,
  CreateOvertimeDto,
  SubmitActualOvertimeDto,
  VerifyOvertimeDto,
} from './dto/overtime.dto';

@Controller('overtimes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOvertimeDto) {
    return this.overtimeService.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('mine') mine?: string,
    @Query('pending') pending?: string,
  ) {
    return this.overtimeService.list(user, {
      teamId: teamId ? Number(teamId) : undefined,
      status,
      mine,
      pending,
    });
  }

  @Get('export')
  async export(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('teamId') teamId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const buf = await this.overtimeService.exportExcel(user, {
      teamId: teamId ? Number(teamId) : undefined,
      from,
      to,
      status,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="overtime-report.xlsx"',
    );
    res.send(buf);
  }

  @Get(':id')
  detail(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.overtimeService.detail(user, id);
  }

  @Patch(':id/approve')
  approve(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.overtimeService.approveApply(user, id, dto);
  }

  @Patch(':id/submit-actual')
  submitActual(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitActualOvertimeDto,
  ) {
    return this.overtimeService.submitActual(user, id, dto);
  }

  @Patch(':id/verify')
  verify(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyOvertimeDto,
  ) {
    return this.overtimeService.verify(user, id, dto);
  }
}
