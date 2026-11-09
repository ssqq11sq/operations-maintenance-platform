import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole, TeamRole, isTeamManagerRole } from '@omp/shared';
import { Team } from '../../entities/team.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { generateInviteCode } from '../../common/utils/invite-code';
import { UserService } from '../user/user.service';
import {
  AddMemberDto,
  CreateTeamDto,
  CreateTeamMemberDto,
  JoinTeamDto,
  UpdateMemberDto,
  UpdateTeamDto,
} from './dto/team.dto';

type AuthUser = {
  id: number;
  roles?: { code: GlobalRole }[];
  currentTeamId?: number | null;
};

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    private readonly userService: UserService,
  ) {}

  private isSuperAdmin(user: AuthUser) {
    return (user.roles || []).some((r) => r.code === GlobalRole.SUPER_ADMIN);
  }

  private isAdmin(user: AuthUser) {
    return (user.roles || []).some(
      (r) => r.code === GlobalRole.SUPER_ADMIN || r.code === GlobalRole.ADMIN,
    );
  }

  async assertCanManageTeam(user: AuthUser, teamId: number) {
    // 超级管理员可管理全部团队；其余仅团队长/团队管理员可编辑
    if (this.isSuperAdmin(user)) return;
    const membership = await this.assertTeamAccess(user, teamId);
    if (!membership || !isTeamManagerRole(membership.teamRole)) {
      throw new ForbiddenException('仅团队长或管理员可操作');
    }
  }

  async create(user: AuthUser, dto: CreateTeamDto) {
    let inviteCode = generateInviteCode();
    while (await this.teamRepo.findOne({ where: { inviteCode } })) {
      inviteCode = generateInviteCode();
    }

    const team = await this.teamRepo.save(
      this.teamRepo.create({
        name: dto.name,
        description: dto.description,
        inviteCode,
      }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({
        teamId: team.id,
        userId: user.id,
        teamRole: TeamRole.LEADER,
      }),
    );

    await this.userService.setCurrentTeam(user.id, team.id);
    return team;
  }

  async update(user: AuthUser, teamId: number, dto: UpdateTeamDto) {
    await this.assertCanManageTeam(user, teamId);
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('团队不存在');
    Object.assign(team, dto);
    return this.teamRepo.save(team);
  }

  async resetInviteCode(user: AuthUser, teamId: number) {
    await this.assertCanManageTeam(user, teamId);
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('团队不存在');
    let inviteCode = generateInviteCode();
    while (await this.teamRepo.findOne({ where: { inviteCode } })) {
      inviteCode = generateInviteCode();
    }
    team.inviteCode = inviteCode;
    return this.teamRepo.save(team);
  }

  async join(user: AuthUser, dto: JoinTeamDto) {
    const team = await this.teamRepo.findOne({
      where: { inviteCode: dto.inviteCode.toUpperCase(), active: true },
    });
    if (!team) throw new NotFoundException('邀请码无效');

    const exists = await this.memberRepo.findOne({
      where: { teamId: team.id, userId: user.id },
    });
    if (exists) throw new BadRequestException('已加入该团队');

    await this.memberRepo.save(
      this.memberRepo.create({
        teamId: team.id,
        userId: user.id,
        teamRole: TeamRole.MEMBER,
      }),
    );

    const me = await this.userService.findById(user.id);
    if (!me?.currentTeamId) {
      await this.userService.setCurrentTeam(user.id, team.id);
    }
    return team;
  }

  async myTeams(user: AuthUser) {
    if (this.isSuperAdmin(user)) {
      const all = await this.teamRepo.find({ order: { id: 'ASC' } });
      return all.map((t) => ({
        ...t,
        teamRole: TeamRole.LEADER,
        canEdit: true,
      }));
    }
    const memberships = await this.memberRepo.find({
      where: { userId: user.id },
      relations: ['team'],
    });
    return memberships.map((m) => ({
      ...m.team,
      teamRole: m.teamRole,
      canEdit: isTeamManagerRole(m.teamRole),
    }));
  }

  async members(user: AuthUser, teamId: number) {
    await this.assertTeamAccess(user, teamId);
    const list = await this.memberRepo.find({
      where: { teamId },
      relations: ['user'],
      order: { id: 'ASC' },
    });
    return list.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      teamRole: m.teamRole,
      displayName: m.user.displayName,
      username: m.user.username,
      phone: m.user.phone,
      roles: m.user.roles,
    }));
  }

  async addMember(user: AuthUser, teamId: number, dto: AddMemberDto) {
    await this.assertCanManageTeam(user, teamId);
    const team = await this.teamRepo.findOne({ where: { id: teamId, active: true } });
    if (!team) throw new NotFoundException('团队不存在或已停用');

    const target = await this.userService.findByUsername(dto.username.trim());
    if (!target) throw new NotFoundException('用户不存在');
    if (!target.active) throw new BadRequestException('该账号已停用');

    const exists = await this.memberRepo.findOne({
      where: { teamId, userId: target.id },
    });
    if (exists) throw new BadRequestException('该用户已在团队中');

    const teamRole = dto.teamRole || TeamRole.MEMBER;
    const member = await this.memberRepo.save(
      this.memberRepo.create({
        teamId,
        userId: target.id,
        teamRole,
      }),
    );
    if (!target.currentTeamId) {
      await this.userService.setCurrentTeam(target.id, teamId);
    }
    return {
      id: member.id,
      teamId,
      userId: target.id,
      teamRole,
      username: target.username,
      displayName: target.displayName,
    };
  }

  async createAndAddMember(
    user: AuthUser,
    teamId: number,
    dto: CreateTeamMemberDto,
  ) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('仅管理员可新建人员账号');
    }
    await this.assertCanManageTeam(user, teamId);
    const team = await this.teamRepo.findOne({ where: { id: teamId, active: true } });
    if (!team) throw new NotFoundException('团队不存在或已停用');

    const created = await this.userService.createUser({
      username: dto.username,
      password: dto.password,
      displayName: dto.displayName,
      phone: dto.phone,
      roles: dto.roles?.length ? dto.roles : [GlobalRole.STAFF],
    });

    const teamRole = dto.teamRole || TeamRole.MEMBER;
    const member = await this.memberRepo.save(
      this.memberRepo.create({
        teamId,
        userId: created.id,
        teamRole,
      }),
    );
    await this.userService.setCurrentTeam(created.id, teamId);
    return {
      id: member.id,
      teamId,
      userId: created.id,
      teamRole,
      username: created.username,
      displayName: created.displayName,
    };
  }

  async updateMember(
    user: AuthUser,
    teamId: number,
    memberId: number,
    dto: UpdateMemberDto,
  ) {
    await this.assertCanManageTeam(user, teamId);
    const member = await this.memberRepo.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('成员不存在');
    member.teamRole = dto.teamRole;
    return this.memberRepo.save(member);
  }

  async removeMember(user: AuthUser, teamId: number, memberId: number) {
    await this.assertCanManageTeam(user, teamId);
    const member = await this.memberRepo.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('成员不存在');
    if (member.userId === user.id) {
      throw new BadRequestException('不能移除自己，请先转让团队长或退出');
    }
    await this.memberRepo.remove(member);
    const target = await this.userService.findById(member.userId);
    if (target?.currentTeamId === teamId) {
      await this.userService.setCurrentTeam(member.userId, null);
    }
    return { ok: true };
  }

  async getInviteInfo(user: AuthUser, teamId: number) {
    await this.assertCanManageTeam(user, teamId);
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('团队不存在');
    return {
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
    };
  }

  async switchTeam(user: AuthUser, teamId: number) {
    await this.assertTeamAccess(user, teamId);
    await this.userService.setCurrentTeam(user.id, teamId);
    return { currentTeamId: teamId };
  }

  async assertTeamAccess(user: AuthUser, teamId: number) {
    if (this.isSuperAdmin(user)) return null as TeamMember | null;
    const membership = await this.memberRepo.findOne({
      where: { teamId, userId: user.id },
    });
    if (!membership) {
      throw new ForbiddenException('无权访问该团队数据');
    }
    return membership;
  }

  async resolveTeamId(user: AuthUser, teamId?: number) {
    const id = teamId || user.currentTeamId;
    if (!id) throw new BadRequestException('请先选择或加入团队');
    await this.assertTeamAccess(user, id);
    return id;
  }

  findById(id: number) {
    return this.teamRepo.findOne({ where: { id } });
  }
}
