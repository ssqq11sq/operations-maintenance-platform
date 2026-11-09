import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { TeamMember } from './team-member.entity';

@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64 })
  username: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 64 })
  displayName: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  /** 微信小程序 openid */
  @Column({ type: 'varchar', length: 64, nullable: true })
  wxOpenId?: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', nullable: true })
  currentTeamId?: number | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'sys_user_role',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];

  @OneToMany(() => TeamMember, (member) => member.user)
  memberships: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
