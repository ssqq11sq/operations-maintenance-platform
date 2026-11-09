import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GlobalRole } from '@omp/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeamService } from './team.service';
import {
  AddMemberDto,
  CreateTeamDto,
  CreateTeamMemberDto,
  JoinTeamDto,
  UpdateMemberDto,
  UpdateTeamDto,
} from './dto/team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /** 任意登录用户可创建团队，创建者自动成为团队长 */
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTeamDto) {
    return this.teamService.create(user, dto);
  }

  @Post('join')
  join(@CurrentUser() user: any, @Body() dto: JoinTeamDto) {
    return this.teamService.join(user, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: any) {
    return this.teamService.myTeams(user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.update(user, id, dto);
  }

  @Post(':id/reset-invite')
  resetInvite(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.resetInviteCode(user, id);
  }

  @Get(':id/invite')
  inviteInfo(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.getInviteInfo(user, id);
  }

  @Get(':id/members')
  members(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.members(user, id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamService.addMember(user, id, dto);
  }

  @Post(':id/members/create')
  @Roles(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)
  createMember(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTeamMemberDto,
  ) {
    return this.teamService.createAndAddMember(user, id, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.teamService.updateMember(user, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.teamService.removeMember(user, id, memberId);
  }

  @Post(':id/switch')
  switch(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.teamService.switchTeam(user, id);
  }
}
