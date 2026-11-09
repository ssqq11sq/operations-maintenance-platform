function resolveApiBase() {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL;
  if (fromEnv) return fromEnv;

  // #ifdef H5
  // H5 走当前站点同源 /api（开发时由 Vite 代理到 Nest）
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  // #endif

  return 'http://localhost:3000/api';
}

const API_BASE = resolveApiBase();
type RequestOptions = {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
};

export function request<T = any>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('omp_token');
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.removeStorageSync('omp_token');
          uni.removeStorageSync('omp_user');
          uni.reLaunch({ url: '/pages/login/index' });
          reject(new Error('未登录'));
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          const data = res.data as any;
          const msg = Array.isArray(data?.message)
            ? data.message.filter(Boolean).join('；')
            : data?.message || '请求失败';
          reject(new Error(typeof msg === 'string' ? msg : '请求失败'));
          return;
        }
        resolve(res.data as T);
      },
      fail: (err) => reject(err),
    });
  });
}

export function uploadFile(
  file: string | File | Blob,
  teamId?: number,
  filename?: string,
) {
  const token = uni.getStorageSync('omp_token');
  const query = teamId ? `?teamId=${teamId}` : '';
  const url = `${API_BASE}/files/upload${query}`;

  // H5 直接传 File，保留原始扩展名（blob: 路径会丢 .doc 后缀）
  if (typeof File !== 'undefined' && file instanceof File) {
    const fd = new FormData();
    fd.append('file', file, filename || file.name);
    return fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fd,
    }).then(async (res) => {
      if (!res.ok) throw new Error('上传失败');
      return res.json() as Promise<{ url: string; key: string; path?: string }>;
    });
  }

  const filePath = typeof file === 'string' ? file : '';
  return new Promise<{ url: string; key: string; path?: string }>((resolve, reject) => {
    if (!filePath) {
      reject(new Error('无效文件'));
      return;
    }
    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      formData: filename ? { filename } : undefined,
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error('上传失败'));
          return;
        }
        try {
          resolve(JSON.parse(res.data as string));
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: reject,
    });
  });
}
