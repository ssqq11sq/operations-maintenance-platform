import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { SmsService } from './sms.service';
import { WechatService } from './wechat.service';
import {
  LoginDto,
  RegisterDto,
  SmsLoginDto,
  WechatLoginDto,
} from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
    private readonly wechatService: WechatService,
    private readonly config: ConfigService,
  ) {}

  private async issueToken(user: any) {
    if (!user?.active) {
      throw new UnauthorizedException('账号已禁用');
    }
    const payload = { sub: user.id, username: user.username };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: this.userService.sanitize(user),
    };
  }

  private autoRegister() {
    return (this.config.get('AUTH_AUTO_REGISTER', 'true') || 'true') !== 'false';
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByUsername(dto.username);
    if (!user || !user.active) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return this.issueToken(user);
  }

  async register(dto: RegisterDto) {
    const user = await this.userService.selfRegister(dto);
    return this.issueToken(user);
  }

  sendSms(phone: string) {
    return this.smsService.sendCode(phone);
  }

  async smsLogin(dto: SmsLoginDto) {
    this.smsService.verifyCode(dto.phone, dto.code);
    const user = await this.userService.findOrCreateByPhone(
      dto.phone,
      this.autoRegister(),
    );
    return this.issueToken(user);
  }

  async wechatLogin(dto: WechatLoginDto) {
    const { openid } = await this.wechatService.code2Session(dto.code);
    const user = await this.userService.findOrCreateByWxOpenId(
      openid,
      this.autoRegister(),
    );
    return this.issueToken(user);
  }

  async bindWechat(userId: number, code: string) {
    const { openid } = await this.wechatService.code2Session(code);
    const user = await this.userService.bindWxOpenId(userId, openid);
    return { ok: true, user };
  }

  wechatStatus() {
    return {
      configured: this.wechatService.isConfigured(),
      mock: !this.wechatService.isConfigured(),
      hint: this.wechatService.isConfigured()
        ? '已配置微信小程序 AppID/Secret'
        : '未配置 WECHAT_MP_APPID/SECRET，当前为 mock 登录（仅联调）',
    };
  }

  async profile(userId: number) {
    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.userService.sanitize(user);
  }
}
