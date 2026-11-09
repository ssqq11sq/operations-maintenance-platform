import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamRole } from '@omp/shared';
import { Team } from './team.entity';
import { User } from './user.entity';

@Entity('sys_team_member')
@Unique(['teamId', 'userId'])
export class TeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 32, default: TeamRole.MEMBER })
  teamRole: TeamRole;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
