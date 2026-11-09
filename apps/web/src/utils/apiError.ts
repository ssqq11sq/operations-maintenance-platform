/** 解析接口错误为中文可读文案 */
export function apiErrorMessage(error: any, fallback = '操作失败'): string {
  const raw = error?.response?.data?.message ?? error?.message;
  if (Array.isArray(raw)) {
    const parts = raw.map((m) => String(m)).filter(Boolean);
    return parts.length ? parts.join('；') : fallback;
  }
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
}
