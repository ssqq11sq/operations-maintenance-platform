import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkOrderStatus } from '@omp/shared';

class FormFieldOptionDto {
  @IsString({ message: '选项名称必须是字符串' })
  label: string;

  @IsString({ message: '选项值必须是字符串' })
  value: string;
}

class FormFieldDto {
  @IsString({ message: '字段 key 必须是字符串' })
  key: string;

  @IsString({ message: '字段名称必须是字符串' })
  label: string;

  @IsString({ message: '字段类型必须是字符串' })
  type: string;

  @IsOptional()
  @IsBoolean({ message: '必填标识无效' })
  required?: boolean;

  @IsOptional()
  @IsString({ message: '占位提示必须是字符串' })
  placeholder?: string;

  @IsOptional()
  @IsArray({ message: '选项必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldOptionDto)
  options?: FormFieldOptionDto[];

  @IsOptional()
  @IsNumber({}, { message: '最大值无效' })
  max?: number;
}

export class CreateTemplateDto {
  @IsOptional()
  @IsNumber({}, { message: '团队 ID 无效' })
  teamId?: number;

  @IsString({ message: '模板名称必须是字符串' })
  @IsNotEmpty({ message: '请填写模板名称' })
  @MaxLength(128, { message: '模板名称最多 128 字' })
  name: string;

  @IsOptional()
  @IsString({ message: '模板描述必须是字符串' })
  description?: string;

  @IsArray({ message: '字段列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString({ message: '模板名称必须是字符串' })
  name?: string;

  @IsOptional()
  @IsString({ message: '模板描述必须是字符串' })
  description?: string;

  @IsOptional()
  @IsArray({ message: '字段列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields?: FormFieldDto[];

  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  active?: boolean;
}

export class CreateWorkOrderDto {
  @IsOptional()
  @IsNumber({}, { message: '团队 ID 无效' })
  teamId?: number;

  @IsNumber({}, { message: '请选择工单模板' })
  templateId: number;

  @IsString({ message: '工单标题必须是字符串' })
  @IsNotEmpty({ message: '请填写工单标题' })
  title: string;

  @IsObject({ message: '表单数据格式不正确' })
  formData: Record<string, unknown>;

  @IsOptional()
  @IsNumber({}, { message: '负责人无效' })
  assigneeId?: number;
}

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus, { message: '工单状态无效' })
  status: WorkOrderStatus;
}

export class UpdateWorkOrderAssigneeDto {
  @IsNumber({}, { message: '负责人无效' })
  assigneeId: number;
}
