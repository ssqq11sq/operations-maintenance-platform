import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PunchRecord } from '../../entities/punch-record.entity';
import { User } from '../../entities/user.entity';
import { TeamModule } from '../team/team.module';
import { EventsModule } from '../events/events.module';
import { PunchService } from './punch.service';
import { PunchController } from './punch.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PunchRecord, User]),
    TeamModule,
    EventsModule,
  ],
  controllers: [PunchController],
  providers: [PunchService],
  exports: [PunchService],
})
export class PunchModule {}
