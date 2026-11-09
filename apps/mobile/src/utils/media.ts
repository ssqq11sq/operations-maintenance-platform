/**
 * 把接口返回的照片地址转成手机可访问的 URL。
 * - 已存的 localhost 地址会改写为当前页面同源（走 Vite /uploads 代理）
 * - 相对路径 /uploads/... 同样补全为同源绝对地址
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  let next = url;

  // #ifdef H5
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    next = next
      .replace(/^https?:\/\/localhost(?::\d+)?/i, origin)
      .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, origin);

    if (next.startsWith('/')) {
      next = `${origin}${next}`;
    }
    return next;
  }
  // #endif

  const apiBase =
    (import.meta as any).env?.VITE_API_BASE_URL || 'http://192.168.110.117:3000/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  if (next.startsWith('/')) {
    return `${origin}${next}`;
  }
  return next
    .replace(/^https?:\/\/localhost(?::\d+)?/i, origin)
    .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, origin);
}
