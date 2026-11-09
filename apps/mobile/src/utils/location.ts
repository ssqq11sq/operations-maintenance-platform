import { request } from './request';

export type LocateResult = {
  latitude: number;
  longitude: number;
  address: string;
  source: 'gps' | 'manual-fallback';
  /** 逆地理编码失败时的配置提示（如 Key 类型错误） */
  geoHint?: string;
};

function isSecureContext() {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    return (
      window.isSecureContext ||
      location.protocol === 'https:' ||
      location.hostname === 'localhost'
    );
  }
  // #endif
  return true;
}

function formatCoordAddress(longitude: number, latitude: number) {
  return `经纬度 ${longitude.toFixed(5)}, ${latitude.toFixed(5)}`;
}

async function reverseGeocode(
  longitude: number,
  latitude: number,
): Promise<{ address: string; geoHint?: string }> {
  try {
    const data = await request<{
      address?: string;
      error?: string;
      hint?: string;
    }>({
      url: `/geo/regeo?longitude=${longitude}&latitude=${latitude}`,
    });
    if (data?.address) {
      return {
        address: data.address,
        geoHint: data.error ? data.hint : undefined,
      };
    }
  } catch {
    // ignore
  }
  return { address: formatCoordAddress(longitude, latitude) };
}

/**
 * 获取定位，并尽量通过后端高德逆地理编码转成文字地址。
 */
export function getDeviceLocation(): Promise<LocateResult> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    if (!isSecureContext()) {
      reject(
        new Error(
          '当前为 HTTP 访问，手机浏览器禁止定位。请使用 https:// 打开本页，或手动填写地址',
        ),
      );
      return;
    }
    // #endif

    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: async (res) => {
        const geo = await reverseGeocode(res.longitude, res.latitude);
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          address: geo.address,
          source: 'gps',
          geoHint: geo.geoHint,
        });
      },
      fail: (err) => {
        const msg =
          (err as any)?.errMsg ||
          (err as any)?.message ||
          '定位失败，请检查系统定位权限';
        reject(new Error(msg));
      },
    });
  });
}
