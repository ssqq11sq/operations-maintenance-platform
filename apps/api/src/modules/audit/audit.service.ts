import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../../entities/operation-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(OperationLog)
    private readonly logRepo: Repository<OperationLog>,
  ) {}

  async log(input: {
    actorId?: number | null;
    actorName?: string | null;
    action: string;
    resource: string;
    resourceId?: string | number | null;
    detail?: Record<string, unknown> | null;
    ip?: string | null;
    teamId?: number | null;
  }) {
    return this.logRepo.save(
      this.logRepo.create({
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        resource: input.resource,
        resourceId:
          input.resourceId == null ? null : String(input.resourceId),
        detail: input.detail ?? null,
        ip: input.ip ?? null,
        teamId: input.teamId ?? null,
      }),
    );
  }

  async list(query: {
    page?: number;
    pageSize?: number;
    resource?: string;
    actorId?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const where: any = {};
    if (query.resource) where.resource = query.resource;
    if (query.actorId) where.actorId = query.actorId;

    const [items, total] = await this.logRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
