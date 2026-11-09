import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SmsRecord = {
  code: string;
  expiresAt: number;
  sentAt: number;
};

/**
 * 短信验证码服务。
 * 默认 SMS_MOCK=true：不真实发短信，验证码写入日志，并在接口中返回 devCode 便于本地联调。
 * 生产可接阿里云/腾讯云等，将 SMS_MOCK=false 并配置厂商密钥后扩展 sendRealSms。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly store = new Map<string, SmsRecord>();

  constructor(private readonly config: ConfigService) {}

  private isMock() {
    return (this.config.get('SMS_MOCK', 'true') || 'true') !== 'false';
  }

  private ttlMs() {
    return Number(this.config.get('SMS_CODE_TTL_SEC', '300')) * 1000;
  }

  async sendCode(phone: string) {
    const prev = this.store.get(phone);
    const now = Date.now();
    if (prev && now - prev.sentAt < 60_000) {
      throw new BadRequestException('发送过于频繁，请稍后再试');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.store.set(phone, {
      code,
      expiresAt: now + this.ttlMs(),
      sentAt: now,
    });

    if (this.isMock()) {
      this.logger.warn(`[SMS_MOCK] phone=${phone} code=${code}`);
      return {
        ok: true,
        mock: true,
        message: '演示模式：验证码已打印到服务端日志',
        devCode: code,
        expiresIn: Math.floor(this.ttlMs() / 1000),
      };
    }

    // 预留真实短信通道
    await this.sendRealSms(phone, code);
    return {
      ok: true,
      mock: false,
      message: '验证码已发送',
      expiresIn: Math.floor(this.ttlMs() / 1000),
    };
  }

  verifyCode(phone: string, code: string) {
    const rec = this.store.get(phone);
    if (!rec) throw new BadRequestException('请先获取验证码');
    if (Date.now() > rec.expiresAt) {
      this.store.delete(phone);
      throw new BadRequestException('验证码已过期');
    }
    if (rec.code !== code) {
      throw new BadRequestException('验证码错误');
    }
    this.store.delete(phone);
    return true;
  }

  private async sendRealSms(phone: string, code: string) {
    // 占位：接入阿里云/腾讯云时在此实现
    this.logger.log(`TODO real SMS to ${phone}: ${code}`);
    throw new BadRequestException(
      '未配置真实短信通道。请设置 SMS_MOCK=true 使用演示模式，或接入短信服务商。',
    );
  }
}
