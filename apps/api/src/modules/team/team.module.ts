import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../../entities/team.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { UserModule } from '../user/user.module';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember]), UserModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
