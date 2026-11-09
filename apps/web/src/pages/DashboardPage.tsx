import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import api from '../api';
import { useAuth } from '../auth';
import ErrorBoundary from '../components/ErrorBoundary';
import AmapMap from '../components/AmapMap';

export default function DashboardPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [liveHint, setLiveHint] = useState('轮询刷新中');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const [latest, overview] = await Promise.all([
        api.get('/punches/latest'),
        api.get('/stats/overview', {
          params: { from: today, to: today },
        }),
      ]);
      setPositions(latest.data.positions || []);
      setStats(overview.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => message.error('加载大屏数据失败'));

    let socket: any = null;
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 20000);

    (async () => {
      try {
        const { io } = await import('socket.io-client');
        const base =
          (import.meta as any).env?.VITE_WS_URL ||
          `${window.location.protocol}//${window.location.hostname}:3000`;
        socket = io(`${base}/realtime`, {
          transports: ['websocket', 'polling'],
          timeout: 3000,
          reconnectionAttempts: 3,
          auth: { token: localStorage.getItem('omp_token') || '' },
        });
        socket.on('connect', () => {
          setLiveHint('实时已连接');
          if (user?.currentTeamId) {
            socket.emit('joinTeam', { teamId: user.currentTeamId });
          }
        });
        socket.on('error', () => setLiveHint('实时鉴权失败，轮询刷新中'));
        socket.on('connect_error', () => setLiveHint('实时不可用，轮询刷新中'));
        socket.on('disconnect', () => setLiveHint('实时断开，轮询刷新中'));
        socket.on('punch.created', () => {
          load().catch(() => undefined);
        });
      } catch {
        setLiveHint('实时不可用，轮询刷新中');
      }
    })();

    return () => {
      socket?.close?.();
      clearInterval(timer);
    };
  }, [user?.currentTeamId]);

  const center = useMemo(() => {
    const p = positions[0];
    return p
      ? ([p.latitude, p.longitude] as [number, number])
      : ([31.2304, 121.4737] as [number, number]);
  }, [positions]);

  const mapPoints = useMemo(
    () =>
      positions.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: p.displayName,
        subtitle: `${dayjs(p.punchedAt).format('HH:mm:ss')} · ${p.address || ''}`,
      })),
    [positions],
  );

  const liveConnected = liveHint.includes('已连接');

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>巡检监控大屏</Typography.Title>
          <Space size={8} style={{ marginTop: 6 }}>
            <Typography.Text type="secondary">当日人员最新位置</Typography.Text>
            <Tag color={liveConnected ? 'success' : 'warning'}>{liveHint}</Tag>
          </Space>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card loading={loading} className="stat-card stat-card--accent">
            <Statistic
              title="今日工单"
              value={stats?.workOrders?.total ?? 0}
              valueStyle={{ color: '#0f6e56' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} className="stat-card stat-card--blue">
            <Statistic
              title="今日完成率"
              value={stats?.workOrders?.completionRate ?? 0}
              suffix="%"
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} className="stat-card stat-card--amber">
            <Statistic
              title="在岗打卡人数"
              value={positions.length}
              valueStyle={{ color: '#d97706' }}
            />
          </Card>
        </Col>
      </Row>

      <ErrorBoundary
        fallback={
          <Card style={{ marginBottom: 16 }} className="stat-card">
            <Typography.Text type="secondary">
              地图组件加载失败，下方仍可查看人员列表。
            </Typography.Text>
          </Card>
        }
      >
        <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden' }}>
          <AmapMap center={center} zoom={12} height={480} points={mapPoints} />
        </div>
      </ErrorBoundary>

      <Card title="当日最新打卡" className="stat-card">
        <Table
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={positions}
          locale={{ emptyText: '今日暂无打卡位置' }}
          columns={[
            { title: '人员', dataIndex: 'displayName' },
            {
              title: '时间',
              dataIndex: 'punchedAt',
              render: (v) => dayjs(v).format('HH:mm:ss'),
            },
            { title: '地址', dataIndex: 'address' },
            { title: '标题', dataIndex: 'title' },
            {
              title: '坐标',
              render: (_, r) => `${r.longitude?.toFixed?.(4)}, ${r.latitude?.toFixed?.(4)}`,
            },
          ]}
        />
      </Card>
    </div>
  );
}
