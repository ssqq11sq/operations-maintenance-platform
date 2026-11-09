import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { GlobalRole } from '@omp/shared';

export class CreateUserDto {
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(2, { message: '用户名至少 2 位' })
  username: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少 6 位' })
  password: string;

  @IsString({ message: '显示名称必须是字符串' })
  @MinLength(1, { message: '请填写显示名称' })
  displayName: string;

  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  @IsArray({ message: '角色必须是数组' })
  @IsEnum(GlobalRole, { each: true, message: '存在无效角色' })
  roles: GlobalRole[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '显示名称必须是字符串' })
  @MinLength(1, { message: '显示名称不能为空' })
  displayName?: string;

  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  active?: boolean;

  @IsOptional()
  @IsArray({ message: '角色必须是数组' })
  @IsEnum(GlobalRole, { each: true, message: '存在无效角色' })
  roles?: GlobalRole[];
}

export class ResetPasswordDto {
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少 6 位' })
  password: string;
}
