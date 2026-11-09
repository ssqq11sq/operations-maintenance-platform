import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GlobalRole, TeamRole } from '@omp/shared';

export class CreateTeamDto {
  @IsString({ message: '团队名称必须是字符串' })
  @IsNotEmpty({ message: '请填写团队名称' })
  @MaxLength(128, { message: '团队名称最多 128 字' })
  name: string;

  @IsOptional()
  @IsString({ message: '团队描述必须是字符串' })
  @MaxLength(255, { message: '团队描述最多 255 字' })
  description?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString({ message: '团队名称必须是字符串' })
  @MaxLength(128, { message: '团队名称最多 128 字' })
  name?: string;

  @IsOptional()
  @IsString({ message: '团队描述必须是字符串' })
  @MaxLength(255, { message: '团队描述最多 255 字' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  active?: boolean;
}

export class JoinTeamDto {
  @IsString({ message: '邀请码必须是字符串' })
  @IsNotEmpty({ message: '请填写邀请码' })
  inviteCode: string;
}

export class UpdateMemberDto {
  @IsEnum(TeamRole, { message: '团队角色无效' })
  teamRole: TeamRole;
}

/** 将已有账号加入当前团队 */
export class AddMemberDto {
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '请填写用户名' })
  username: string;

  @IsOptional()
  @IsEnum(TeamRole, { message: '团队角色无效' })
  teamRole?: TeamRole;
}

/** 新建账号并加入当前团队（管理员） */
export class CreateTeamMemberDto {
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

  @IsOptional()
  @IsEnum(TeamRole, { message: '团队角色无效' })
  teamRole?: TeamRole;

  @IsOptional()
  @IsArray({ message: '角色必须是数组' })
  @IsEnum(GlobalRole, { each: true, message: '存在无效角色' })
  roles?: GlobalRole[];
}
