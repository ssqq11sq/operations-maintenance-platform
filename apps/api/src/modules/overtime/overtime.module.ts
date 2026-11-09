import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvertimeRequest } from '../../entities/overtime-request.entity';
import { User } from '../../entities/user.entity';
import { TeamModule } from '../team/team.module';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OvertimeRequest, User]),
    TeamModule,
  ],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OvertimeModule {}
