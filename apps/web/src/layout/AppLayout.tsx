import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChartOutlined,
  CameraOutlined,
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileTextOutlined,
  UserOutlined,
  UserSwitchOutlined,
  NodeIndexOutlined,
  AuditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Select, Space, Typography, Button, message } from 'antd';
import { GlobalRole } from '@omp/shared';
import api from '../api';
import { useAuth } from '../auth';

const { Header, Sider, Content } = Layout;

type Team = { id: number; name: string; inviteCode?: string };

export default function AppLayout() {
  const { user, logout, hasRole, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const loadTeams = async () => {
    const { data } = await api.get('/teams/mine');
    setTeams(data);
  };

  useEffect(() => {
    loadTeams().catch(() => message.error('加载团队失败'));
  }, []);

  const onSwitchTeam = async (teamId: number) => {
    await api.post(`/teams/${teamId}/switch`);
    await refreshProfile();
    message.success('已切换团队');
  };

  const items = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">监控大屏</Link>,
    },
    { key: '/photos', icon: <CameraOutlined />, label: <Link to="/photos">照片审计</Link> },
    {
      key: '/routes',
      icon: <NodeIndexOutlined />,
      label: <Link to="/routes">巡检路线</Link>,
    },
    { key: '/stats', icon: <BarChartOutlined />, label: <Link to="/stats">统计分析</Link> },
    {
      key: '/work-orders',
      icon: <FileTextOutlined />,
      label: <Link to="/work-orders">工单管理</Link>,
    },
    {
      key: '/templates',
      icon: <FormOutlined />,
      label: <Link to="/templates">工单模板</Link>,
    },
    {
      key: '/overtimes',
      icon: <ClockCircleOutlined />,
      label: <Link to="/overtimes">加班管理</Link>,
    },
    ...(hasRole(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)
      ? [
          {
            key: '/audit',
            icon: <AuditOutlined />,
            label: <Link to="/audit">操作审计</Link>,
          },
        ]
      : []),
    { key: '/teams', icon: <TeamOutlined />, label: <Link to="/teams">团队管理</Link> },
    { key: '/members', icon: <UserOutlined />, label: <Link to="/members">成员管理</Link> },
    ...(hasRole(GlobalRole.SUPER_ADMIN)
      ? [
          {
            key: '/users',
            icon: <UserSwitchOutlined />,
            label: <Link to="/users">系统用户</Link>,
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{
          borderRight: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.92)',
        }}
      >
        <div
          style={{
            padding: collapsed ? '18px 12px' : '20px 16px 14px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Typography.Title
            level={4}
            style={{ margin: 0, color: 'var(--accent)', fontSize: collapsed ? 16 : 18 }}
          >
            {collapsed ? '运维' : '运维管理系统'}
          </Typography.Title>
          {!collapsed && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              O&M Admin
            </Typography.Text>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          style={{ borderInlineEnd: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid var(--border)',
            height: 64,
          }}
        >
          <Space>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              当前团队
            </Typography.Text>
            <Select
              style={{ width: 220 }}
              placeholder="选择团队"
              value={user?.currentTeamId ?? undefined}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
              onChange={onSwitchTeam}
            />
          </Space>
          <Space size={12}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {user?.displayName}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {user?.roles?.[0]?.name || '用户'}
              </Typography.Text>
            </div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            className="panel-card"
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 140px)',
            }}
          >
            <Outlet context={{ teams, reloadTeams: loadTeams }} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
