import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { createWriteStream, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import { PunchRecord } from '../../entities/punch-record.entity';
import { User } from '../../entities/user.entity';
import { TeamService } from '../team/team.service';
import { CreatePunchDto } from './dto/create-punch.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class PunchService {
  constructor(
    @InjectRepository(PunchRecord)
    private readonly punchRepo: Repository<PunchRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly teamService: TeamService,
    private readonly events: EventsGateway,
  ) {}

  async create(user: any, dto: CreatePunchDto) {
    const teamId = await this.teamService.resolveTeamId(user, dto.teamId);
    const record = await this.punchRepo.save(
      this.punchRepo.create({
        teamId,
        userId: user.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        title: dto.title,
        subtitle: dto.subtitle,
        remark: dto.remark,
        photoUrl: dto.photoUrl,
        punchedAt: dto.punchedAt ? new Date(dto.punchedAt) : new Date(),
      }),
    );
    this.events.emitToTeam(teamId, 'punch.created', {
      id: record.id,
      userId: user.id,
      teamId,
    });
    return record;
  }

  async list(
    user: any,
    query: {
      teamId?: number;
      userId?: number;
      date?: string;
      from?: string;
      to?: string;
    },
  ) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const where: any = { teamId };
    if (query.userId) where.userId = query.userId;

    if (query.date) {
      const start = dayjs(query.date).startOf('day').toDate();
      const end = dayjs(query.date).endOf('day').toDate();
      where.punchedAt = Between(start, end);
    } else if (query.from || query.to) {
      const start = query.from
        ? dayjs(query.from).startOf('day').toDate()
        : dayjs('2000-01-01').toDate();
      const end = query.to
        ? dayjs(query.to).endOf('day').toDate()
        : dayjs().endOf('day').toDate();
      where.punchedAt = Between(start, end);
    }

    const records = await this.punchRepo.find({
      where,
      order: { punchedAt: 'DESC' },
    });

    const userIds = [...new Set(records.map((r) => r.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return records.map((r) => ({
      ...r,
      displayName: userMap.get(r.userId)?.displayName || `用户${r.userId}`,
      folderPath: `${teamId}/${r.userId}/${dayjs(r.punchedAt).format('YYYY-MM-DD')}`,
    }));
  }

  async feedToday(user: any, teamId?: number) {
    const date = dayjs().format('YYYY-MM-DD');
    return this.list(user, { teamId, date });
  }

  async folders(user: any, teamId?: number) {
    const tid = await this.teamService.resolveTeamId(user, teamId);
    const records = await this.punchRepo.find({
      where: { teamId: tid },
      order: { punchedAt: 'DESC' },
    });
    const userIds = [...new Set(records.map((r) => r.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.displayName]));

    type DateNode = { date: string; count: number };
    type UserNode = {
      userId: number;
      displayName: string;
      count: number;
      dates: DateNode[];
    };

    const byUser = new Map<number, UserNode>();
    for (const r of records) {
      const date = dayjs(r.punchedAt).format('YYYY-MM-DD');
      if (!byUser.has(r.userId)) {
        byUser.set(r.userId, {
          userId: r.userId,
          displayName: userMap.get(r.userId) || `用户${r.userId}`,
          count: 0,
          dates: [],
        });
      }
      const uNode = byUser.get(r.userId)!;
      uNode.count += 1;
      let dNode = uNode.dates.find((d) => d.date === date);
      if (!dNode) {
        dNode = { date, count: 0 };
        uNode.dates.push(dNode);
      }
      dNode.count += 1;
    }

    const usersTree = [...byUser.values()].map((u) => ({
      ...u,
      dates: u.dates.sort((a, b) => (a.date < b.date ? 1 : -1)),
    }));

    return {
      teamId: tid,
      total: records.length,
      users: usersTree,
    };
  }

  async route(user: any, query: { teamId?: number; userId: number; date: string }) {
    const teamId = await this.teamService.resolveTeamId(user, query.teamId);
    const list = await this.list(user, {
      teamId,
      userId: query.userId,
      date: query.date,
    });
    const rawPoints = [...list].sort(
      (a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime(),
    );
    // 轻量轨迹纠偏：去重邻近抖动点 + Douglas-Peucker 简化
    const deduped = this.dedupeNearPoints(rawPoints, 8);
    const points = this.douglasPeucker(deduped, 0.00012);
    const profile = await this.userRepo.findOne({ where: { id: query.userId } });
    return {
      teamId,
      userId: query.userId,
      displayName: profile?.displayName || `用户${query.userId}`,
      date: query.date,
      rawCount: rawPoints.length,
      points,
      rawPoints,
      distanceMeters: this.pathDistanceMeters(points),
    };
  }

  /** 去掉相邻过近的抖动点（米） */
  private dedupeNearPoints(points: any[], minMeters: number) {
    if (points.length <= 1) return points;
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = out[out.length - 1];
      const d = this.haversineMeters(
        prev.latitude,
        prev.longitude,
        points[i].latitude,
        points[i].longitude,
      );
      if (d >= minMeters) out.push(points[i]);
    }
    return out;
  }

  private douglasPeucker(points: any[], epsilon: number): any[] {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let index = 0;
    const end = points.length - 1;
    for (let i = 1; i < end; i++) {
      const d = this.perpDist(
        points[i],
        points[0],
        points[end],
      );
      if (d > maxDist) {
        index = i;
        maxDist = d;
      }
    }
    if (maxDist > epsilon) {
      const left = this.douglasPeucker(points.slice(0, index + 1), epsilon);
      const right = this.douglasPeucker(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[end]];
  }

  private perpDist(p: any, a: any, b: any) {
    const x = p.longitude;
    const y = p.latitude;
    const x1 = a.longitude;
    const y1 = a.latitude;
    const x2 = b.longitude;
    const y2 = b.latitude;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Math.hypot(x - x1, y - y1);
    }
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    const nx = x1 + t * dx;
    const ny = y1 + t * dy;
    return Math.hypot(x - nx, y - ny);
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  private pathDistanceMeters(points: any[]) {
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += this.haversineMeters(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude,
      );
    }
    return Math.round(sum);
  }

  async latestPositions(user: any, teamId?: number) {
    const tid = await this.teamService.resolveTeamId(user, teamId);
    const today = dayjs().format('YYYY-MM-DD');
    const list = await this.list(user, { teamId: tid, date: today });
    const latestByUser = new Map<number, any>();
    for (const item of list) {
      const prev = latestByUser.get(item.userId);
      if (!prev || new Date(item.punchedAt) > new Date(prev.punchedAt)) {
        latestByUser.set(item.userId, item);
      }
    }
    return {
      teamId: tid,
      date: today,
      positions: [...latestByUser.values()],
    };
  }

  private resolveLocalPhotoPath(photoUrl: string) {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
    let relative = photoUrl;
    const marker = '/uploads/';
    const idx = photoUrl.indexOf(marker);
    if (idx >= 0) relative = photoUrl.slice(idx + marker.length);
    else if (photoUrl.startsWith('/uploads/')) relative = photoUrl.slice('/uploads/'.length);
    return join(process.cwd(), uploadDir, relative);
  }

  async downloadZip(
    user: any,
    query: { teamId?: number; userId?: number; date?: string },
  ): Promise<StreamableFile> {
    const records = await this.list(user, query);
    if (!records.length) throw new NotFoundException('没有可打包的照片');

    const zipPath = join(
      tmpdir(),
      `omp-photos-${Date.now()}-${Math.random().toString(16).slice(2)}.zip`,
    );
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);

      for (const r of records) {
        const filePath = this.resolveLocalPhotoPath(r.photoUrl);
        if (!existsSync(filePath)) continue;
        const date = dayjs(r.punchedAt).format('YYYY-MM-DD');
        const name = `${r.teamId}/${r.userId}/${date}/${r.id}.jpg`;
        archive.file(filePath, { name });
      }
      archive.finalize();
    });

    const stream = createReadStream(zipPath);
    return new StreamableFile(stream, {
      type: 'application/zip',
      disposition: `attachment; filename="photos.zip"`,
    });
  }
}
