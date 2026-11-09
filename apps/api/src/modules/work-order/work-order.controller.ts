import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GlobalRole, WorkOrderStatus } from '@omp/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkOrderService } from './work-order.service';
import {
  CreateTemplateDto,
  CreateWorkOrderDto,
  UpdateTemplateDto,
  UpdateWorkOrderAssigneeDto,
  UpdateWorkOrderStatusDto,
} from './dto/work-order.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Post('templates')
  createTemplate(@CurrentUser() user: any, @Body() dto: CreateTemplateDto) {
    return this.workOrderService.createTemplate(user, dto);
  }

  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.workOrderService.updateTemplate(user, id, dto);
  }

  @Get('templates')
  listTemplates(
    @CurrentUser() user: any,
    @Query('teamId') teamId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.workOrderService.listTemplates(
      user,
      teamId ? Number(teamId) : undefined,
      includeInactive === 'true' || includeInactive === '1',
    );
  }

  @Post('work-orders')
  createOrder(@CurrentUser() user: any, @Body() dto: CreateWorkOrderDto) {
    return this.workOrderService.createOrder(user, dto);
  }

  @Get('work-orders')
  listOrders(
    @CurrentUser() user: any,
    @Query('teamId') teamId?: string,
    @Query('status') status?: WorkOrderStatus,
    @Query('mine') mine?: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.workOrderService.listOrders(user, {
      teamId: teamId ? Number(teamId) : undefined,
      status,
      mine: mine === 'true' || mine === '1',
      templateId: templateId ? Number(templateId) : undefined,
    });
  }

  @Get('work-orders/:id')
  getOrder(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.workOrderService.getOrder(user, id);
  }

  @Patch('work-orders/:id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.workOrderService.updateStatus(user, id, dto);
  }

  @Patch('work-orders/:id/assignee')
  assign(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkOrderAssigneeDto,
  ) {
    return this.workOrderService.assign(user, id, dto.assigneeId);
  }
}
