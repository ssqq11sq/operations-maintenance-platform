import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly config: ConfigService) {}

  private appId() {
    return (this.config.get('WECHAT_MP_APPID') || '').trim();
  }

  private secret() {
    return (this.config.get('WECHAT_MP_SECRET') || '').trim();
  }

  isConfigured() {
    return !!(this.appId() && this.secret());
  }

  /**
   * 用 wx.login code 换取 openid。
   * 未配置 AppID/Secret 时进入 mock：用 code 派生稳定 openid，便于本地/H5 联调。
   */
  async code2Session(code: string): Promise<{ openid: string; sessionKey?: string }> {
    if (!code?.trim()) {
      throw new BadRequestException('缺少微信登录 code');
    }

    if (!this.isConfigured()) {
      const openid = `mock_${createHash('sha256').update(code).digest('hex').slice(0, 28)}`;
      this.logger.warn(`[WECHAT_MOCK] code2session -> ${openid}`);
      return { openid };
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', this.appId());
    url.searchParams.set('secret', this.secret());
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      openid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (!data.openid) {
      this.logger.error(`code2session failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(
        data.errmsg || `微信登录失败(${data.errcode || 'unknown'})`,
      );
    }

    return { openid: data.openid, sessionKey: data.session_key };
  }
}
