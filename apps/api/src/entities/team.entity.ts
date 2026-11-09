import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

@Entity('sys_team')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ length: 16, unique: true })
  inviteCode: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
