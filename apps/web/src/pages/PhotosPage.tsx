import { useEffect, useMemo, useState, type Key } from 'react';
import {
  Breadcrumb,
  Button,
  Image,
  Space,
  Table,
  Tree,
  Typography,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import api from '../api';

function resolvePhotoUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  return url
    .replace(/^https?:\/\/localhost(?::\d+)?/i, '')
    .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, '');
}

type Selection = {
  userId?: number;
  date?: string;
  label: string;
};

export default function PhotosPage() {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [selection, setSelection] = useState<Selection>({ label: '全部' });
  const [loading, setLoading] = useState(false);

  const loadFolders = async () => {
    const { data } = await api.get('/punches/folders');
    const nodes: DataNode[] = (data.users || []).map((u: any) => ({
      key: `user-${u.userId}`,
      title: `${u.displayName}（${u.count}）`,
      children: (u.dates || []).map((d: any) => ({
        key: `user-${u.userId}/date-${d.date}`,
        title: `${d.date}（${d.count}）`,
        isLeaf: true,
      })),
    }));
    setTreeData(nodes);
  };

  const loadPhotos = async (sel: Selection) => {
    setLoading(true);
    try {
      const { data } = await api.get('/punches', {
        params: {
          userId: sel.userId,
          date: sel.date,
        },
      });
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders().catch(() => message.error('加载目录失败'));
    loadPhotos({ label: '全部' }).catch(() => message.error('加载照片失败'));
  }, []);

  const onSelect = (keys: Key[]) => {
    const key = String(keys[0] || '');
    if (!key) return;
    if (key.startsWith('user-') && key.includes('/date-')) {
      const [uPart, dPart] = key.split('/');
      const userId = Number(uPart.replace('user-', ''));
      const date = dPart.replace('date-', '');
      const sel = { userId, date, label: `${userId} / ${date}` };
      setSelection(sel);
      loadPhotos(sel).catch(() => message.error('加载照片失败'));
      return;
    }
    if (key.startsWith('user-')) {
      const userId = Number(key.replace('user-', ''));
      const sel = { userId, label: `人员 ${userId}` };
      setSelection(sel);
      loadPhotos(sel).catch(() => message.error('加载照片失败'));
    }
  };

  const downloadZip = async () => {
    try {
      const res = await api.get('/punches/download', {
        params: {
          userId: selection.userId,
          date: selection.date,
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photos-${selection.date || 'all'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('打包下载失败（当前目录可能无本地文件）');
    }
  };

  const crumbs = useMemo(() => {
    const items = [{ title: '照片目录' }];
    if (selection.userId) items.push({ title: `人员 ${selection.userId}` });
    if (selection.date) items.push({ title: selection.date });
    return items;
  }, [selection]);

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 520 }}>
      <div
        style={{
          width: 280,
          borderRight: '1px solid #e4ebe7',
          paddingRight: 12,
          overflow: 'auto',
        }}
      >
        <Typography.Title level={5}>文件夹</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          团队 / 人员 / 日期
        </Typography.Paragraph>
        <Tree treeData={treeData} onSelect={onSelect} defaultExpandAll />
      </div>
      <div style={{ flex: 1 }}>
        <div className="page-header">
          <div>
            <Typography.Title level={4}>照片审计</Typography.Title>
            <Breadcrumb items={crumbs} style={{ marginTop: 8 }} />
          </div>
          <Button onClick={downloadZip}>打包下载当前目录</Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={list}
          locale={{ emptyText: '暂无照片' }}
          columns={[
            {
              title: '时间',
              dataIndex: 'punchedAt',
              render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
            },
            { title: '人员', dataIndex: 'displayName' },
            { title: '目录', dataIndex: 'folderPath' },
            { title: '标题', dataIndex: 'title' },
            { title: '地址', dataIndex: 'address' },
            {
              title: '照片',
              dataIndex: 'photoUrl',
              render: (url: string) => (
                <Image
                  src={resolvePhotoUrl(url)}
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
