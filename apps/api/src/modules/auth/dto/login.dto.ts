import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '请输入用户名' })
  username: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(4, { message: '密码至少 4 位' })
  password: string;
}

/** 自助注册：默认 STAFF，无团队 */
export class RegisterDto {
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名至少 3 位' })
  @MaxLength(32, { message: '用户名最多 32 位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名仅支持字母、数字和下划线',
  })
  username: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(64, { message: '密码过长' })
  password: string;

  @IsString({ message: '显示名称必须是字符串' })
  @MinLength(1, { message: '请填写显示名称' })
  @MaxLength(64, { message: '显示名称最多 64 字' })
  displayName: string;

  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone?: string;
}

export class SendSmsDto {
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class SmsLoginDto {
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString({ message: '验证码必须是字符串' })
  @MinLength(4, { message: '验证码至少 4 位' })
  code: string;
}

export class WechatLoginDto {
  @IsString({ message: '微信登录凭证无效' })
  @IsNotEmpty({ message: '缺少微信登录凭证' })
  code: string;
}

export class WechatBindDto {
  @IsString({ message: '微信绑定凭证无效' })
  @IsNotEmpty({ message: '缺少微信绑定凭证' })
  code: string;
}
