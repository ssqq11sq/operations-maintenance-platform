import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  GlobalRole,
  OVERTIME_STATUS_LABEL,
  OvertimeStatus,
  isTeamManagerRole,
} from '@omp/shared';
import { OvertimeRequest } from '../../entities/overtime-request.entity';
import { User } from '../../entities/user.entity';
import { TeamService } from '../team/team.service';
import {
  ApproveOvertimeDto,
  CreateOvertimeDto,
  SubmitActualOvertimeDto,
  VerifyOvertimeDto,
} from './dto/overtime.dto';

type AuthUser = {
  id: number;
  roles?: { code: GlobalRole }[];
  currentTeamId?: number | null;
};

@Injectable()
export class OvertimeService {
  constructor(
    @InjectRepository(OvertimeRequest)
    private readonly otRepo: Repository<OvertimeRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly teamService: TeamService,
  ) {}

  private isAdmin(user: AuthUser) {
    return (user.roles || []).some(
      (r) => r.code === GlobalRole.SUPER_ADMIN || r.code === GlobalRole.ADMIN,
    );
  }

  private async assertCanApprove(user: AuthUser, teamId: number) {
    if (!(await this.canViewTeamRecords(user, teamId))) {
      throw new ForbiddenException('仅团队长或管理员可审批');
    }
  }

  /** 团队长 / 管理员可看本团队全部；普通成员只能看自己 */
  private async canViewTeamRecords(user: AuthUser, teamId: number) {
    if (this.isAdmin(user)) {
      await this.teamService.assertTeamAccess(user, teamId);
      return true;
    }
    const membership = await this.teamService.assertTeamAccess(user, teamId);
    return !!membership && isTeamManagerRole(membership.teamRole);
  }

  private calcMinutes(start: Date, end: Date) {
    const ms = end.getTime() - start.getTime();
    if (ms <= 0) throw new BadRequestException('结束时间必须晚于开始时间');
    return Math.round(ms / 60000);
  }

  private async enrich(rows: OvertimeRequest[]) {
    const ids = [
      ...new Set(
        rows.flatMap((r) =>
          [r.applicantId, r.applyApproverId, r.verifyApproverId].filter(
            Boolean,
          ) as number[],
        ),
      ),
    ];
    const userMap = new Map<number, User>();
    if (ids.length) {
      const list = await this.userRepo.find({ where: { id: In(ids) } });
      list.forEach((u) => userMap.set(u.id, u));
    }
    return rows.map((r) => ({
      ...r,
      statusLabel: OVERTIME_STATUS_LABEL[r.status] || r.status,
      applicantName: userMap.get(r.applicantId)?.displayName || '',
      applyApproverName: r.applyApproverId
        ? userMap.get(r.applyApproverId)?.displayName || ''
        : '',
      verifyApproverName: r.verifyApproverId
        ? userMap.get(r.verifyApproverId)?.displayName || ''
        : '',
      planMinutes: this.safeMinutes(r.planStartAt, r.planEndAt),
    }));
  }

  private safeMinutes(start?: Date | null, end?: Date | null) {
    if (!start || !end) return null;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return ms > 0 ? Math.round(ms / 60000) : null;
  }

  async create(user: AuthUser, dto: CreateOvertimeDto) {
    const teamId = await this.teamService.resolveTeamId(user);
    const start = new Date(dto.planStartAt);
    const end = new Date(dto.planEndAt);
    this.calcMinutes(start, end);
    const row = await this.otRepo.save(
      this.otRepo.create({
        teamId,
        applicantId: user.id,
        planStartAt: start,
        planEndAt: end,
        reason: dto.reason.trim(),
        status: OvertimeStatus.PENDING,
      }),
    );
    const [item] = await this.enrich([row]);
    return item;
  }

  async list(
    user: AuthUser,
    query: {
      teamId?: number;
      status?: string;
      mine?: string;
      pending?: string;
    },
  ) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const canSeeTeam = await this.canViewTeamRecords(user, teamId);
    const qb = this.otRepo
      .createQueryBuilder('o')
      .where('o.teamId = :teamId', { teamId })
      .orderBy('o.id', 'DESC');

    if (query.pending === 'true' || query.pending === '1') {
      // 待我审批：申请待审 / 核验待审
      await this.assertCanApprove(user, teamId);
      qb.andWhere('o.status IN (:...st)', {
        st: [OvertimeStatus.PENDING, OvertimeStatus.PENDING_VERIFY],
      });
    } else if (
      !canSeeTeam ||
      query.mine === 'true' ||
      query.mine === '1'
    ) {
      // 普通成员强制仅本人；团队长/管理员可选「我的」
      qb.andWhere('o.applicantId = :uid', { uid: user.id });
    }
    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    const rows = await qb.getMany();
    return this.enrich(rows);
  }

  async detail(user: AuthUser, id: number) {
    const row = await this.otRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('加班申请不存在');
    const canSeeTeam = await this.canViewTeamRecords(user, row.teamId);
    if (!canSeeTeam && row.applicantId !== user.id) {
      throw new ForbiddenException('无权查看该加班记录');
    }
    const [item] = await this.enrich([row]);
    return item;
  }

  async approveApply(user: AuthUser, id: number, dto: ApproveOvertimeDto) {
    const row = await this.otRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('加班申请不存在');
    await this.assertCanApprove(user, row.teamId);
    if (row.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('当前状态不可审批申请');
    }
    if (dto.pass) {
      row.status = OvertimeStatus.APPROVED;
      row.rejectReason = null;
      row.applyApproverId = user.id;
      row.applyApprovedAt = new Date();
    } else {
      if (!dto.reason?.trim()) {
        throw new BadRequestException('退回请填写理由');
      }
      row.status = OvertimeStatus.REJECTED;
      row.rejectReason = dto.reason.trim();
      row.applyApproverId = user.id;
      row.applyApprovedAt = new Date();
    }
    await this.otRepo.save(row);
    return this.detail(user, id);
  }

  async submitActual(
    user: AuthUser,
    id: number,
    dto: SubmitActualOvertimeDto,
  ) {
    const row = await this.otRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('加班申请不存在');
    await this.teamService.assertTeamAccess(user, row.teamId);
    if (row.applicantId !== user.id) {
      throw new ForbiddenException('仅申请人可补录实际加班');
    }
    if (
      row.status !== OvertimeStatus.APPROVED &&
      row.status !== OvertimeStatus.VERIFY_REJECTED
    ) {
      throw new BadRequestException('当前状态不可补录实际加班');
    }
    const start = new Date(dto.actualStartAt);
    const end = new Date(dto.actualEndAt);
    const minutes = this.calcMinutes(start, end);
    if (!dto.photoUrls?.length) {
      throw new BadRequestException('请至少上传一张打卡照片');
    }
    row.actualStartAt = start;
    row.actualEndAt = end;
    row.actualMinutes = minutes;
    row.photoUrls = dto.photoUrls;
    row.status = OvertimeStatus.PENDING_VERIFY;
    row.verifyRejectReason = null;
    await this.otRepo.save(row);
    return this.detail(user, id);
  }

  async verify(user: AuthUser, id: number, dto: VerifyOvertimeDto) {
    const row = await this.otRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('加班申请不存在');
    await this.assertCanApprove(user, row.teamId);
    if (row.status !== OvertimeStatus.PENDING_VERIFY) {
      throw new BadRequestException('当前状态不可核验');
    }
    if (dto.pass) {
      row.status = OvertimeStatus.COMPLETED;
      row.verifyRejectReason = null;
      row.verifyApproverId = user.id;
      row.verifyApprovedAt = new Date();
    } else {
      if (!dto.reason?.trim()) {
        throw new BadRequestException('退回请填写理由');
      }
      row.status = OvertimeStatus.VERIFY_REJECTED;
      row.verifyRejectReason = dto.reason.trim();
      row.verifyApproverId = user.id;
      row.verifyApprovedAt = new Date();
    }
    await this.otRepo.save(row);
    return this.detail(user, id);
  }

  async exportExcel(
    user: AuthUser,
    query: { teamId?: number; from?: string; to?: string; status?: string },
  ) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const canSeeTeam = await this.canViewTeamRecords(user, teamId);

    const qb = this.otRepo
      .createQueryBuilder('o')
      .where('o.teamId = :teamId', { teamId })
      .orderBy('o.id', 'DESC');

    if (!canSeeTeam) {
      qb.andWhere('o.applicantId = :uid', { uid: user.id });
    }
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.from) {
      qb.andWhere('o.planStartAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('o.planStartAt <= :to', {
        to: new Date(`${query.to}T23:59:59`),
      });
    }

    const rows = await this.enrich(await qb.getMany());
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('加班记录');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '申请人', key: 'applicantName', width: 14 },
      { header: '状态', key: 'statusLabel', width: 12 },
      { header: '计划开始', key: 'planStartAt', width: 20 },
      { header: '计划结束', key: 'planEndAt', width: 20 },
      { header: '计划时长(分钟)', key: 'planMinutes', width: 14 },
      { header: '事由', key: 'reason', width: 30 },
      { header: '实际开始', key: 'actualStartAt', width: 20 },
      { header: '实际结束', key: 'actualEndAt', width: 20 },
      { header: '实际时长(分钟)', key: 'actualMinutes', width: 14 },
      { header: '退回理由', key: 'rejectReason', width: 20 },
      { header: '核验退回理由', key: 'verifyRejectReason', width: 20 },
      { header: '照片数', key: 'photoCount', width: 10 },
    ];
    const fmt = (v?: Date | string | null) =>
      v ? String(v).replace('T', ' ').slice(0, 19) : '';
    rows.forEach((r) => {
      sheet.addRow({
        id: r.id,
        applicantName: r.applicantName,
        statusLabel: r.statusLabel,
        planStartAt: fmt(r.planStartAt),
        planEndAt: fmt(r.planEndAt),
        planMinutes: r.planMinutes,
        reason: r.reason,
        actualStartAt: fmt(r.actualStartAt),
        actualEndAt: fmt(r.actualEndAt),
        actualMinutes: r.actualMinutes,
        rejectReason: r.rejectReason || '',
        verifyRejectReason: r.verifyRejectReason || '',
        photoCount: r.photoUrls?.length || 0,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
