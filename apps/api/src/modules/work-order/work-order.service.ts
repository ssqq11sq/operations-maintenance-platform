import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkOrderStatus } from '@omp/shared';
import { FormTemplate } from '../../entities/form-template.entity';
import { WorkOrder } from '../../entities/work-order.entity';
import { User } from '../../entities/user.entity';
import { TeamService } from '../team/team.service';
import {
  CreateTemplateDto,
  CreateWorkOrderDto,
  UpdateTemplateDto,
  UpdateWorkOrderStatusDto,
} from './dto/work-order.dto';

@Injectable()
export class WorkOrderService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templateRepo: Repository<FormTemplate>,
    @InjectRepository(WorkOrder)
    private readonly orderRepo: Repository<WorkOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly teamService: TeamService,
  ) {}

  async createTemplate(user: any, dto: CreateTemplateDto) {
    const teamId = await this.teamService.resolveTeamId(user, dto.teamId);
    // 仅团队长 / 超级管理员可配置模板
    await this.teamService.assertCanManageTeam(user, teamId);
    return this.templateRepo.save(
      this.templateRepo.create({
        teamId,
        name: dto.name,
        description: dto.description,
        fields: JSON.parse(JSON.stringify(dto.fields)) as any,
        createdBy: user.id,
      }),
    );
  }

  async updateTemplate(user: any, id: number, dto: UpdateTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('模板不存在');
    await this.teamService.assertCanManageTeam(user, template.teamId);
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.active !== undefined) template.active = dto.active;
    if (dto.fields !== undefined) {
      // 显式赋值，避免 Object.assign 在 sql.js/simple-json 下丢字段
      template.fields = JSON.parse(JSON.stringify(dto.fields)) as any;
    }
    return this.templateRepo.save(template);
  }

  async listTemplates(user: any, teamId?: number, includeInactive = false) {
    const tid = await this.teamService.resolveTeamId(user, teamId);
    const where: any = { teamId: tid };
    if (!includeInactive) where.active = true;
    const [list, team] = await Promise.all([
      this.templateRepo.find({
        where,
        order: { id: 'DESC' },
      }),
      this.teamService.findById(tid),
    ]);
    return list.map((t) => ({
      ...t,
      fields: this.normalizeFields(t.fields),
      teamId: tid,
      teamName: team?.name || '',
    }));
  }

  private normalizeFields(raw: unknown) {
    let data: unknown = raw;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  async createOrder(user: any, dto: CreateWorkOrderDto) {
    const teamId = await this.teamService.resolveTeamId(user, dto.teamId);
    const template = await this.templateRepo.findOne({
      where: { id: dto.templateId, teamId, active: true },
    });
    if (!template) throw new NotFoundException('工单模板不存在');

    return this.orderRepo.save(
      this.orderRepo.create({
        teamId,
        templateId: dto.templateId,
        title: dto.title,
        formData: dto.formData,
        createdBy: user.id,
        assigneeId: dto.assigneeId ?? user.id,
        status: WorkOrderStatus.PENDING,
      }),
    );
  }

  async updateStatus(user: any, id: number, dto: UpdateWorkOrderStatusDto) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('工单不存在');
    await this.teamService.assertTeamAccess(user, order.teamId);
    const from = order.status;
    order.status = dto.status;
    const saved = await this.orderRepo.save(order);
    return { ...saved, _audit: { from, to: dto.status } };
  }

  async assign(user: any, id: number, assigneeId: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('工单不存在');
    await this.teamService.assertTeamAccess(user, order.teamId);
    const members = await this.teamService.members(user, order.teamId);
    const ok = members.some((m: any) => m.userId === assigneeId);
    if (!ok) throw new ForbiddenException('指派人必须是团队成员');
    const from = order.assigneeId;
    order.assigneeId = assigneeId;
    const saved = await this.orderRepo.save(order);
    const assignee = await this.userRepo.findOne({ where: { id: assigneeId } });
    return {
      ...saved,
      assigneeName: assignee?.displayName || `用户${assigneeId}`,
      _audit: { from, to: assigneeId },
    };
  }

  async listOrders(
    user: any,
    query: {
      teamId?: number;
      status?: WorkOrderStatus;
      mine?: boolean;
      templateId?: number;
    },
  ) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const where: any = { teamId };
    if (query.status) where.status = query.status;
    if (query.templateId) where.templateId = query.templateId;
    if (query.mine) where.createdBy = user.id;

    const orders = await this.orderRepo.find({
      where,
      order: { id: 'DESC' },
    });

    const userIds = [
      ...new Set(
        orders.flatMap((o) => [o.createdBy, o.assigneeId].filter(Boolean) as number[]),
      ),
    ];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.displayName]));
    const templates = await this.templateRepo.find({ where: { teamId } });
    const templateMap = new Map(templates.map((t) => [t.id, t.name]));

    return orders.map((o) => ({
      ...o,
      creatorName: userMap.get(o.createdBy) || `用户${o.createdBy}`,
      assigneeName: o.assigneeId
        ? userMap.get(o.assigneeId) || `用户${o.assigneeId}`
        : null,
      templateName: templateMap.get(o.templateId) || `模板${o.templateId}`,
    }));
  }

  async getOrder(user: any, id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('工单不存在');
    await this.teamService.assertTeamAccess(user, order.teamId);

    const [creator, assignee, template] = await Promise.all([
      this.userRepo.findOne({ where: { id: order.createdBy } }),
      order.assigneeId
        ? this.userRepo.findOne({ where: { id: order.assigneeId } })
        : Promise.resolve(null),
      this.templateRepo.findOne({ where: { id: order.templateId } }),
    ]);

    return {
      ...order,
      creatorName: creator?.displayName || `用户${order.createdBy}`,
      assigneeName: assignee?.displayName || null,
      templateName: template?.name || `模板${order.templateId}`,
      templateFields: template?.fields || [],
    };
  }
}
