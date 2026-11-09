import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormFieldDef } from '@omp/shared';

@Entity('biz_form_template')
export class FormTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  fields: FormFieldDef[];

  @Column({ default: true })
  active: boolean;

  @Column()
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
