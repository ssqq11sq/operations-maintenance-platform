/** 将 Nest / class-validator 返回的 message 规范为中文可读字符串 */
export function formatApiMessage(message: unknown, fallback = '请求失败'): string {
  if (Array.isArray(message)) {
    const parts = message
      .map((m) => (typeof m === 'string' ? m : String(m)))
      .filter(Boolean);
    return parts.length ? parts.join('；') : fallback;
  }
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
