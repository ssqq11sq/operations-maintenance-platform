import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('biz_punch_record')
export class PunchRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  userId: number;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ length: 128, nullable: true })
  title?: string;

  @Column({ length: 128, nullable: true })
  subtitle?: string;

  @Column({ length: 255, nullable: true })
  remark?: string;

  @Column({ length: 512 })
  photoUrl: string;

  @Column({ type: 'datetime' })
  punchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
