import { Module, Controller, Get, Query, Injectable, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const AMAP_HINT: Record<string, string> = {
  INVALID_USER_KEY: 'AMAP_KEY 无效，请检查 apps/api/.env 中的密钥是否正确。',
  USERKEY_PLAT_NOMATCH:
    'Key 平台类型不匹配：逆地理编码需要「Web服务」类型 Key，不能用 Web端(JS API) 或小程序 Key。',
  DAILY_QUERY_OVER_LIMIT: '今日调用量已超限，请到高德控制台查看配额。',
  INVALID_PARAMS: '经纬度参数无效。',
  INSUFFICIENT_PRIVILEGES: '当前 Key 未开通逆地理编码权限。',
};

@Injectable()
export class GeoService {
  constructor(private readonly config: ConfigService) {}

  configStatus() {
    const key = (this.config.get<string>('AMAP_KEY') || '').trim();
    return {
      configured: !!key,
      keyPreview: key ? `${key.slice(0, 4)}…${key.slice(-4)}` : '',
      hint: key
        ? '已配置 AMAP_KEY。若地址仍显示经纬度，请确认 Key 类型为「Web服务」。'
        : '未配置 AMAP_KEY。请在 apps/api/.env 填写高德「Web服务」Key 后重启 API。',
    };
  }

  async regeo(longitude: number, latitude: number) {
    const key = (this.config.get<string>('AMAP_KEY') || '').trim();
    const fallback = `经纬度 ${Number(longitude).toFixed(5)}, ${Number(latitude).toFixed(5)}`;

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return {
        address: fallback,
        formatted: '',
        provider: 'none',
        error: 'INVALID_PARAMS',
        hint: AMAP_HINT.INVALID_PARAMS,
      };
    }

    if (!key) {
      return {
        address: fallback,
        formatted: '',
        provider: 'none',
        error: 'AMAP_KEY_MISSING',
        hint: '未配置 AMAP_KEY。请在 apps/api/.env 使用「Web服务」类型 Key。',
      };
    }

    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('key', key);
    url.searchParams.set('location', `${longitude},${latitude}`);
    url.searchParams.set('extensions', 'base');

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as any;
      if (data.status !== '1') {
        const code = String(data.info || data.infocode || 'regeo failed');
        return {
          address: fallback,
          formatted: '',
          provider: 'amap',
          error: code,
          hint:
            AMAP_HINT[code] ||
            `高德返回：${code}。请确认 AMAP_KEY 为「Web服务」类型且未过期。`,
        };
      }

      const formatted =
        data.regeocode?.formatted_address ||
        data.regeocode?.addressComponent?.township ||
        '';
      return {
        address: formatted || fallback,
        formatted,
        provider: 'amap',
        raw: data.regeocode?.addressComponent,
      };
    } catch (e: any) {
      return {
        address: fallback,
        formatted: '',
        provider: 'amap',
        error: e?.message || 'network error',
        hint: '请求高德 Web 服务失败，请检查网络或稍后重试。',
      };
    }
  }
}

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('config')
  config() {
    return this.geoService.configStatus();
  }

  @Get('regeo')
  regeo(
    @Query('longitude') longitude: string,
    @Query('latitude') latitude: string,
  ) {
    return this.geoService.regeo(Number(longitude), Number(latitude));
  }
}

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
