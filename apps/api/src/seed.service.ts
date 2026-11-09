import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { GlobalRole } from '@omp/shared';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { FormTemplate } from './entities/form-template.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    @InjectRepository(FormTemplate)
    private readonly templateRepo: Repository<FormTemplate>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get('OMP_RESET_DATA') === 'true') {
      await this.resetBusinessData();
    }
    await this.seed();
  }

  /** 清空业务与账号数据（保留角色定义），供初始化 / 重置环境 */
  async resetBusinessData() {
    this.logger.warn('OMP_RESET_DATA=true → 清空账号与业务数据');
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of [
        'biz_overtime_request',
        'biz_work_order',
        'biz_punch_record',
        'biz_form_template',
        'sys_operation_log',
        'sys_team_member',
        'sys_user_role',
        'sys_user',
        'sys_team',
      ]) {
        await qr.query(`TRUNCATE TABLE \`${table}\``).catch(async () => {
          // sqlite / 表不存在时忽略
          await qr.query(`DELETE FROM \`${table}\``).catch(() => undefined);
        });
      }
      await qr.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      // sqljs 无 TRUNCATE/FOREIGN_KEY：逐表清空
      await this.userRepo.clear().catch(() => undefined);
      await this.memberRepo.clear().catch(() => undefined);
      await this.teamRepo.clear().catch(() => undefined);
      await this.templateRepo.clear().catch(() => undefined);
      this.logger.warn(`reset fallback: ${String(e)}`);
    } finally {
      await qr.release();
    }
  }

  async seed() {
    const roleDefs = [
      { code: GlobalRole.SUPER_ADMIN, name: '主管理员' },
      { code: GlobalRole.ADMIN, name: '管理员' },
      { code: GlobalRole.STAFF, name: '运维人员' },
    ];

    for (const def of roleDefs) {
      const exists = await this.roleRepo.findOne({ where: { code: def.code } });
      if (!exists) await this.roleRepo.save(this.roleRepo.create(def));
    }

    const superRole = await this.roleRepo.findOne({
      where: { code: GlobalRole.SUPER_ADMIN },
    });
    if (!superRole) {
      throw new Error('SUPER_ADMIN 角色未初始化');
    }

    const username = this.config.get('SEED_SUPER_USERNAME', 'superadmin');
    const password = this.config.get('SEED_SUPER_PASSWORD', 'Omp@2026Super');
    const displayName = this.config.get('SEED_SUPER_DISPLAY_NAME', '超级管理员');

    let user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          username,
          password: await bcrypt.hash(password, 10),
          displayName,
          active: true,
          currentTeamId: null,
          roles: [superRole],
        }),
      );
      this.logger.log(
        `已创建超级管理员账号: ${username}（请登录后尽快修改密码）`,
      );
    } else {
      // 确保角色包含 SUPER_ADMIN，且无默认团队绑定
      const codes = (user.roles || []).map((r) => r.code);
      if (!codes.includes(GlobalRole.SUPER_ADMIN)) {
        user.roles = [...(user.roles || []), superRole];
        await this.userRepo.save(user);
      }
    }

    this.logger.log('Seed ready: 仅保留超级管理员，无演示团队/演示账号');
  }
}
