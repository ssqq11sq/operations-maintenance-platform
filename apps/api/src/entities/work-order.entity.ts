import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkOrderStatus } from '@omp/shared';

@Entity('biz_work_order')
export class WorkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  templateId: number;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 32, default: WorkOrderStatus.PENDING })
  status: WorkOrderStatus;

  @Column({ type: 'simple-json' })
  formData: Record<string, unknown>;

  @Column()
  createdBy: number;

  @Column({ type: 'int', nullable: true })
  assigneeId?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
