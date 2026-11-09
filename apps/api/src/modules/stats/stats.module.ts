import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '../../entities/work-order.entity';
import { PunchRecord } from '../../entities/punch-record.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { TeamModule } from '../team/team.module';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkOrder, PunchRecord, TeamMember]),
    TeamModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
