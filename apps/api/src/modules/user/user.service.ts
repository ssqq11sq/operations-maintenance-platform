import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { GlobalRole } from '@omp/shared';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  findByUsername(username: string) {
    return this.userRepo.findOne({ where: { username } });
  }

  findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  findByPhone(phone: string) {
    return this.userRepo.findOne({ where: { phone } });
  }

  findByWxOpenId(wxOpenId: string) {
    return this.userRepo.findOne({ where: { wxOpenId } });
  }

  async ensureStaffRole() {
    const role = await this.roleRepo.findOne({
      where: { code: GlobalRole.STAFF },
    });
    if (!role) throw new BadRequestException('系统角色未初始化');
    return role;
  }

  /**
   * 短信登录：手机号已绑定用户则返回；否则按需自动注册 STAFF（演示）。
   */
  async findOrCreateByPhone(phone: string, autoRegister: boolean) {
    let user = await this.findByPhone(phone);
    if (user) return user;
    if (!autoRegister) {
      throw new NotFoundException('该手机号未绑定账号，请联系管理员');
    }
    const role = await this.ensureStaffRole();
    const password = await bcrypt.hash(
      `sms_${phone}_${Date.now()}`,
      10,
    );
    user = await this.userRepo.save(
      this.userRepo.create({
        username: `m_${phone}`,
        password,
        displayName: `用户${phone.slice(-4)}`,
        phone,
        active: true,
        roles: [role],
      }),
    );
    return user;
  }

  async findOrCreateByWxOpenId(openid: string, autoRegister: boolean) {
    let user = await this.findByWxOpenId(openid);
    if (user) return user;
    if (!autoRegister) {
      throw new NotFoundException('微信未绑定账号，请先用账号或短信登录后绑定');
    }
    const role = await this.ensureStaffRole();
    const short = openid.slice(-8);
    const password = await bcrypt.hash(`wx_${openid}`, 10);
    user = await this.userRepo.save(
      this.userRepo.create({
        username: `wx_${short}_${Date.now().toString(36)}`,
        password,
        displayName: `微信用户${short}`,
        wxOpenId: openid,
        active: true,
        roles: [role],
      }),
    );
    return user;
  }

  async bindWxOpenId(userId: number, openid: string) {
    const occupied = await this.findByWxOpenId(openid);
    if (occupied && occupied.id !== userId) {
      throw new ConflictException('该微信已绑定其他账号');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    user.wxOpenId = openid;
    return this.sanitize(await this.userRepo.save(user));
  }

  async setCurrentTeam(userId: number, teamId: number | null) {
    await this.userRepo.update(userId, { currentTeamId: teamId });
    return this.findById(userId);
  }

  sanitize(user: User) {
    const { password, ...rest } = user;
    return rest;
  }

  async listUsers() {
    const users = await this.userRepo.find({
      order: { id: 'ASC' },
      relations: ['roles'],
    });
    return users.map((u) => this.sanitize(u));
  }

  private async resolveRoles(codes: GlobalRole[]) {
    if (!codes?.length) {
      throw new BadRequestException('至少选择一个角色');
    }
    const roles = await this.roleRepo.find({ where: { code: In(codes) } });
    if (roles.length !== codes.length) {
      throw new BadRequestException('存在无效角色');
    }
    return roles;
  }

  private roleCodes(user: User | null | undefined): GlobalRole[] {
    return (user?.roles || []).map((r) => r.code);
  }

  private async countActiveSuperAdmins(excludeUserId?: number) {
    const supers = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.code = :code', { code: GlobalRole.SUPER_ADMIN })
      .andWhere('u.active = :active', { active: true })
      .getMany();
    return supers.filter((u) => u.id !== excludeUserId).length;
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.findByUsername(dto.username);
    if (exists) throw new ConflictException('用户名已存在');
    const roles = await this.resolveRoles(dto.roles);
    const password = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      password,
      displayName: dto.displayName,
      phone: dto.phone,
      active: true,
      roles,
    });
    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  /**
   * 自助注册：固定 STAFF，不加入任何团队（currentTeamId 为空）。
   */
  async selfRegister(dto: {
    username: string;
    password: string;
    displayName: string;
    phone?: string;
  }) {
    const username = dto.username.trim();
    const exists = await this.findByUsername(username);
    if (exists) throw new ConflictException('用户名已存在');
    if (dto.phone) {
      const phoneUsed = await this.findByPhone(dto.phone);
      if (phoneUsed) throw new ConflictException('手机号已被使用');
    }
    const role = await this.ensureStaffRole();
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        username,
        password,
        displayName: dto.displayName.trim(),
        phone: dto.phone || undefined,
        active: true,
        currentTeamId: null,
        roles: [role],
      }),
    );
    return user;
  }

  async updateUser(actor: any, id: number, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');

    const actorId = actor?.id;
    const currentCodes = this.roleCodes(user);
    const nextCodes = dto.roles ?? currentCodes;
    const willBeSuper = nextCodes.includes(GlobalRole.SUPER_ADMIN);
    const wasSuper = currentCodes.includes(GlobalRole.SUPER_ADMIN);
    const willBeActive = dto.active ?? user.active;

    if (actorId === id) {
      if (dto.active === false) {
        throw new ForbiddenException('不能停用自己的账号');
      }
      if (wasSuper && !willBeSuper) {
        throw new ForbiddenException('不能移除自己的超级管理员角色');
      }
    }

    if (wasSuper && (!willBeSuper || !willBeActive)) {
      const others = await this.countActiveSuperAdmins(id);
      if (others < 1) {
        throw new ForbiddenException('至少保留一名活跃的超级管理员');
      }
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.roles) {
      user.roles = await this.resolveRoles(dto.roles);
    }

    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  async resetPassword(id: number, password: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    user.password = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);
    return { ok: true };
  }
}
