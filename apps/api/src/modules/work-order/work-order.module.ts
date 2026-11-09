import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormTemplate } from '../../entities/form-template.entity';
import { WorkOrder } from '../../entities/work-order.entity';
import { User } from '../../entities/user.entity';
import { TeamModule } from '../team/team.module';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormTemplate, WorkOrder, User]),
    TeamModule,
  ],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
