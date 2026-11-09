const QUEUE_KEY = 'omp_offline_punch_queue';

export type OfflinePunchItem = {
  id: string;
  createdAt: string;
  localPhoto: string;
  payload: {
    latitude: number;
    longitude: number;
    address: string;
    title: string;
    subtitle: string;
    remark: string;
    punchedAt: string;
    teamId?: number;
  };
};

export function loadQueue(): OfflinePunchItem[] {
  try {
    const raw = uni.getStorageSync(QUEUE_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveQueue(list: OfflinePunchItem[]) {
  uni.setStorageSync(QUEUE_KEY, list);
}

export function enqueuePunch(item: Omit<OfflinePunchItem, 'id' | 'createdAt'>) {
  const list = loadQueue();
  list.push({
    ...item,
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  saveQueue(list);
  return list.length;
}

export async function flushQueue(
  uploadFile: (
    filePath: string,
    teamId?: number,
  ) => Promise<{ url: string; key: string; path?: string }>,
  request: (opts: any) => Promise<any>,
): Promise<{ ok: number; fail: number }> {
  const list = loadQueue();
  if (!list.length) return { ok: 0, fail: 0 };
  const remain: OfflinePunchItem[] = [];
  let ok = 0;
  let fail = 0;
  for (const item of list) {
    try {
      const uploaded = await uploadFile(item.localPhoto, item.payload.teamId);
      await request({
        url: '/punches',
        method: 'POST',
        data: {
          ...item.payload,
          photoUrl: uploaded.path || uploaded.url,
        },
      });
      ok += 1;
    } catch {
      remain.push(item);
      fail += 1;
    }
  }
  saveQueue(remain);
  return { ok, fail };
}
