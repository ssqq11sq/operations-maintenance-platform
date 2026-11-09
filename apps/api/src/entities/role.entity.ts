import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GlobalRole } from '@omp/shared';
import { User } from './user.entity';

@Entity('sys_role')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: GlobalRole;

  @Column({ length: 64 })
  name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
