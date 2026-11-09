import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OvertimeStatus } from '@omp/shared';

@Entity('biz_overtime_request')
export class OvertimeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  applicantId: number;

  @Column({ type: 'datetime' })
  planStartAt: Date;

  @Column({ type: 'datetime' })
  planEndAt: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 32, default: OvertimeStatus.PENDING })
  status: OvertimeStatus;

  /** 申请审批退回理由 */
  @Column({ type: 'text', nullable: true })
  rejectReason?: string | null;

  @Column({ type: 'int', nullable: true })
  applyApproverId?: number | null;

  @Column({ type: 'datetime', nullable: true })
  applyApprovedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  actualStartAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  actualEndAt?: Date | null;

  /** 实际加班分钟数 */
  @Column({ type: 'int', nullable: true })
  actualMinutes?: number | null;

  @Column({ type: 'simple-json', nullable: true })
  photoUrls?: string[] | null;

  /** 核验退回理由 */
  @Column({ type: 'text', nullable: true })
  verifyRejectReason?: string | null;

  @Column({ type: 'int', nullable: true })
  verifyApproverId?: number | null;

  @Column({ type: 'datetime', nullable: true })
  verifyApprovedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
