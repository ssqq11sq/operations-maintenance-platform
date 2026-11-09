import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { WorkOrderStatus } from '@omp/shared';
import { WorkOrder } from '../../entities/work-order.entity';
import { PunchRecord } from '../../entities/punch-record.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { TeamService } from '../team/team.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(WorkOrder)
    private readonly orderRepo: Repository<WorkOrder>,
    @InjectRepository(PunchRecord)
    private readonly punchRepo: Repository<PunchRecord>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    private readonly teamService: TeamService,
  ) {}

  private range(from?: string, to?: string) {
    const start = from
      ? dayjs(from).startOf('day').toDate()
      : dayjs().subtract(30, 'day').startOf('day').toDate();
    const end = to ? dayjs(to).endOf('day').toDate() : dayjs().endOf('day').toDate();
    return { start, end };
  }

  async overview(user: any, query: { teamId?: number; from?: string; to?: string }) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const { start, end } = this.range(query.from, query.to);

    const orders = await this.orderRepo.find({
      where: { teamId, createdAt: Between(start, end) as any },
    });
    const punches = await this.punchRepo.find({
      where: { teamId, punchedAt: Between(start, end) },
    });
    const members = await this.memberRepo.count({ where: { teamId } });

    const total = orders.length;
    const completed = orders.filter(
      (o) =>
        o.status === WorkOrderStatus.COMPLETED ||
        o.status === WorkOrderStatus.CLOSED,
    ).length;
    const durations = orders
      .filter((o) => o.status === WorkOrderStatus.COMPLETED || o.status === WorkOrderStatus.CLOSED)
      .map((o) => dayjs(o.updatedAt).diff(dayjs(o.createdAt), 'minute'))
      .filter((n) => n >= 0);
    const avgMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const byStatus: Record<string, number> = {};
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }
    const byTemplate: Record<number, number> = {};
    for (const o of orders) {
      byTemplate[o.templateId] = (byTemplate[o.templateId] || 0) + 1;
    }

    const punchUserDays = new Set(
      punches.map((p) => `${p.userId}:${dayjs(p.punchedAt).format('YYYY-MM-DD')}`),
    );
    const dayCount = Math.max(1, dayjs(end).diff(dayjs(start), 'day') + 1);
    const attendanceRate =
      members > 0
        ? Math.round((punchUserDays.size / (members * dayCount)) * 1000) / 10
        : 0;

    return {
      teamId,
      from: dayjs(start).format('YYYY-MM-DD'),
      to: dayjs(end).format('YYYY-MM-DD'),
      workOrders: {
        total,
        completed,
        completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
        avgHandleMinutes: avgMinutes,
        byStatus,
        byTemplate,
      },
      punches: {
        total: punches.length,
        uniquePersonDays: punchUserDays.size,
        memberCount: members,
        attendanceRate,
      },
    };
  }

  async exportExcel(user: any, query: { teamId?: number; from?: string; to?: string }) {
    const overview = await this.overview(user, query);
    const teamId = overview.teamId;
    const { start, end } = this.range(query.from, query.to);
    const orders = await this.orderRepo.find({
      where: { teamId, createdAt: Between(start, end) as any },
      order: { id: 'DESC' },
    });
    const punches = await this.punchRepo.find({
      where: { teamId, punchedAt: Between(start, end) },
      order: { punchedAt: 'DESC' },
    });

    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('汇总');
    summary.addRow(['指标', '数值']);
    summary.addRow(['工单总量', overview.workOrders.total]);
    summary.addRow(['完成数', overview.workOrders.completed]);
    summary.addRow(['完成率(%)', overview.workOrders.completionRate]);
    summary.addRow(['平均处理时长(分钟)', overview.workOrders.avgHandleMinutes]);
    summary.addRow(['打卡次数', overview.punches.total]);
    summary.addRow(['出勤率(%)', overview.punches.attendanceRate]);

    const orderSheet = wb.addWorksheet('工单明细');
    orderSheet.addRow(['ID', '标题', '模板ID', '状态', '创建人', '创建时间', '更新时间']);
    orders.forEach((o) => {
      orderSheet.addRow([
        o.id,
        o.title,
        o.templateId,
        o.status,
        o.createdBy,
        o.createdAt,
        o.updatedAt,
      ]);
    });

    const punchSheet = wb.addWorksheet('打卡明细');
    punchSheet.addRow(['ID', '人员ID', '时间', '地址', '标题', '经度', '纬度']);
    punches.forEach((p) => {
      punchSheet.addRow([
        p.id,
        p.userId,
        p.punchedAt,
        p.address,
        p.title,
        p.longitude,
        p.latitude,
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
