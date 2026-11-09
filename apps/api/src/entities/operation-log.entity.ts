import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sys_operation_log')
export class OperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  actorId?: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorName?: string | null;

  @Column({ type: 'varchar', length: 32 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  resource: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceId?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  detail?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @Column({ type: 'int', nullable: true })
  teamId?: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
