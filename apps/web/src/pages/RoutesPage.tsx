import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  DatePicker,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api';
import ErrorBoundary from '../components/ErrorBoundary';
import AmapMap from '../components/AmapMap';

function resolvePhotoUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  return url
    .replace(/^https?:\/\/localhost(?::\d+)?/i, '')
    .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, '');
}

export default function RoutesPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [userId, setUserId] = useState<number | undefined>();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [useCorrected, setUseCorrected] = useState(true);
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    api
      .get('/auth/profile')
      .then(async (profile) => {
        const teamId = profile.data.currentTeamId;
        if (!teamId) return;
        const { data } = await api.get(`/teams/${teamId}/members`);
        setMembers(data);
        if (data[0]) setUserId(data[0].userId);
      })
      .catch(() => undefined);
  }, []);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    setPlaying(false);
    try {
      const { data } = await api.get('/punches/route', {
        params: { userId, date: date.format('YYYY-MM-DD') },
      });
      setRoute(data);
      setPlayIndex(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load().catch(() => message.error('加载路线失败'));
  }, [userId]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setPlayIndex((i) => {
        const max = (useCorrected ? route?.points : route?.rawPoints)?.length || 0;
        if (max <= 0) return 0;
        if (i >= max - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 900);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, useCorrected, route]);

  const points = useCorrected ? route?.points || [] : route?.rawPoints || route?.points || [];
  const visiblePoints = points.slice(0, Math.max(1, playIndex + 1));
  const mapPoints = useMemo(
    () =>
      visiblePoints.map((p: any, idx: number) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: `#${idx + 1} ${dayjs(p.punchedAt).format('HH:mm:ss')}`,
        subtitle: p.address || '',
      })),
    [visiblePoints],
  );
  const center = useMemo(() => {
    const p = visiblePoints[visiblePoints.length - 1] || points[0];
    return p
      ? ([p.latitude, p.longitude] as [number, number])
      : ([31.2304, 121.4737] as [number, number]);
  }, [visiblePoints, points]);

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>巡检路线复盘</Typography.Title>
          <span className="page-desc">
            轨迹纠偏 + 时间轴回放
            {route?.distanceMeters != null
              ? ` · 纠偏后约 ${route.distanceMeters} 米 · 原始 ${route.rawCount || 0} 点 / 纠偏 ${(route.points || []).length} 点`
              : ''}
          </span>
        </div>
        <Space wrap>
          <Select
            style={{ width: 180 }}
            placeholder="选择人员"
            value={userId}
            options={members.map((m) => ({
              label: m.displayName,
              value: m.userId,
            }))}
            onChange={setUserId}
          />
          <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          <Space>
            <span>纠偏轨迹</span>
            <Switch checked={useCorrected} onChange={setUseCorrected} />
          </Space>
          <Button
            type="primary"
            loading={loading}
            onClick={() => load().catch(() => message.error('加载失败'))}
          >
            查询
          </Button>
        </Space>
      </div>

      <Space style={{ width: '100%', marginBottom: 12 }} align="center">
        <Button
          onClick={() => {
            if (!points.length) return;
            if (playIndex >= points.length - 1) setPlayIndex(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? '暂停回放' : '开始回放'}
        </Button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Slider
            min={0}
            max={Math.max(0, points.length - 1)}
            value={playIndex}
            onChange={(v) => {
              setPlaying(false);
              setPlayIndex(v);
            }}
            tooltip={{
              formatter: (v) => {
                const p = points[v || 0];
                return p ? dayjs(p.punchedAt).format('HH:mm:ss') : '';
              },
            }}
          />
        </div>
        <Typography.Text type="secondary">
          {points[playIndex]
            ? dayjs(points[playIndex].punchedAt).format('HH:mm:ss')
            : '--:--:--'}
        </Typography.Text>
      </Space>

      <ErrorBoundary>
        <div style={{ marginBottom: 16 }}>
          <AmapMap
            center={center}
            zoom={13}
            height={480}
            points={mapPoints}
            line
            highlightIndex={mapPoints.length - 1}
          />
        </div>
      </ErrorBoundary>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={points}
        locale={{ emptyText: '当日暂无打卡点' }}
        rowClassName={(_, idx) => (idx === playIndex ? 'omp-route-active' : '')}
        onRow={(_, idx) => ({
          onClick: () => {
            setPlaying(false);
            setPlayIndex(idx || 0);
          },
        })}
        columns={[
          {
            title: '时间',
            dataIndex: 'punchedAt',
            render: (v) => dayjs(v).format('HH:mm:ss'),
          },
          { title: '地址', dataIndex: 'address' },
          { title: '标题', dataIndex: 'title' },
          {
            title: '照片',
            dataIndex: 'photoUrl',
            render: (url: string) =>
              url ? (
                <img
                  src={resolvePhotoUrl(url)}
                  alt=""
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                '-'
              ),
          },
        ]}
      />
      <style>{`.omp-route-active td { background: #e8f4ef !important; }`}</style>
    </div>
  );
}
