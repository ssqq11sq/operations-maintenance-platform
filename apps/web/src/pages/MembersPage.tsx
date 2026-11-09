import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  GLOBAL_ROLE_LABEL,
  GlobalRole,
  TEAM_ROLE_LABEL,
  TeamRole,
  isTeamManagerRole,
} from '@omp/shared';
import api from '../api';
import { apiErrorMessage } from '../utils/apiError';
import { useAuth } from '../auth';

const TEAM_ROLE_OPTIONS = Object.values(TeamRole).map((value) => ({
  value,
  label: TEAM_ROLE_LABEL[value],
}));

const STAFF_ROLE_OPTIONS = [
  { value: GlobalRole.STAFF, label: GLOBAL_ROLE_LABEL[GlobalRole.STAFF] },
  { value: GlobalRole.ADMIN, label: GLOBAL_ROLE_LABEL[GlobalRole.ADMIN] },
];

export default function MembersPage() {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [createForm] = Form.useForm();

  const canManage = useMemo(() => {
    if (!user) return false;
    if (hasRole(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)) return true;
    const me = data.find((m) => m.userId === user.id);
    return isTeamManagerRole(me?.teamRole);
  }, [user, data, hasRole]);

  const canCreateUser = hasRole(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN);

  const load = async () => {
    if (!user?.currentTeamId) return;
    setLoading(true);
    try {
      const [{ data: list }, invite] = await Promise.all([
        api.get(`/teams/${user.currentTeamId}/members`),
        api.get(`/teams/${user.currentTeamId}/invite`).catch(() => null),
      ]);
      setData(list);
      if (invite?.data) {
        setInviteCode(invite.data.inviteCode || '');
        setTeamName(invite.data.name || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => message.error('加载成员失败'));
  }, [user?.currentTeamId]);

  const updateRole = async (memberId: number, teamRole: TeamRole) => {
    if (!user?.currentTeamId) return;
    try {
      await api.patch(`/teams/${user.currentTeamId}/members/${memberId}`, {
        teamRole,
      });
      message.success('团队角色已更新');
      await load();
    } catch (e: any) {
      message.error(apiErrorMessage(e, '更新失败'));
    }
  };

  const removeMember = async (memberId: number) => {
    if (!user?.currentTeamId) return;
    try {
      await api.delete(`/teams/${user.currentTeamId}/members/${memberId}`);
      message.success('已移出团队');
      await load();
    } catch (e: any) {
      message.error(apiErrorMessage(e, '移出失败'));
    }
  };

  const copyInvite = async () => {
    if (!inviteCode) {
      message.warning('暂无邀请码或无权限查看');
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteCode);
      message.success(`邀请码已复制：${inviteCode}`);
    } catch {
      Modal.info({ title: '团队邀请码', content: inviteCode });
    }
  };

  const resetInvite = async () => {
    if (!user?.currentTeamId) return;
    try {
      const { data: team } = await api.post(
        `/teams/${user.currentTeamId}/reset-invite`,
      );
      setInviteCode(team.inviteCode);
      message.success(`新邀请码：${team.inviteCode}`);
    } catch (e: any) {
      message.error(apiErrorMessage(e, '重置失败'));
    }
  };

  const addExisting = async () => {
    if (!user?.currentTeamId) return;
    const values = await addForm.validateFields();
    try {
      await api.post(`/teams/${user.currentTeamId}/members`, values);
      message.success('已加入团队');
      setOpen(false);
      addForm.resetFields();
      await load();
    } catch (e: any) {
      message.error(apiErrorMessage(e, '添加失败'));
    }
  };

  const createAndAdd = async () => {
    if (!user?.currentTeamId) return;
    const values = await createForm.validateFields();
    try {
      await api.post(`/teams/${user.currentTeamId}/members/create`, {
        ...values,
        roles: values.roles || [GlobalRole.STAFF],
      });
      message.success('人员已创建并加入团队');
      setOpen(false);
      createForm.resetFields();
      await load();
    } catch (e: any) {
      message.error(apiErrorMessage(e, '创建失败'));
    }
  };

  if (!user?.currentTeamId) {
    return (
      <div>
        <Typography.Title level={4}>成员管理</Typography.Title>
        <Typography.Text type="secondary">请先在顶部选择或加入团队</Typography.Text>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>成员管理</Typography.Title>
          <span className="page-desc">
            {teamName ? `${teamName} · ` : ''}分配团队角色、新增人员或邀请加入
          </span>
        </div>
        <Space wrap>
          {canManage && inviteCode ? (
            <Button onClick={copyInvite}>邀请码 {inviteCode}</Button>
          ) : null}
          {canManage ? (
            <Button onClick={resetInvite}>重置邀请码</Button>
          ) : null}
          {canManage ? (
            <Button
              type="primary"
              onClick={() => {
                addForm.setFieldsValue({ teamRole: TeamRole.MEMBER });
                createForm.setFieldsValue({
                  teamRole: TeamRole.MEMBER,
                  roles: [GlobalRole.STAFF],
                });
                setOpen(true);
              }}
            >
              新增人员
            </Button>
          ) : null}
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        locale={{ emptyText: '暂无成员' }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'displayName' },
          { title: '手机号', dataIndex: 'phone', render: (v) => v || '-' },
          {
            title: '团队角色',
            dataIndex: 'teamRole',
            render: (role: TeamRole, row) =>
              canManage ? (
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={role}
                  options={TEAM_ROLE_OPTIONS}
                  onChange={(v) => updateRole(row.id, v)}
                />
              ) : (
                <Tag
                  color={
                    role === TeamRole.LEADER
                      ? 'green'
                      : role === TeamRole.ADMIN
                        ? 'blue'
                        : 'default'
                  }
                >
                  {TEAM_ROLE_LABEL[role] || role}
                </Tag>
              ),
          },
          {
            title: '系统角色',
            dataIndex: 'roles',
            render: (roles: { code: GlobalRole; name: string }[]) =>
              (roles || [])
                .map((r) => GLOBAL_ROLE_LABEL[r.code] || r.name)
                .join('、') || '-',
          },
          {
            title: '操作',
            render: (_, row) => (
              <Space>
                <Popconfirm
                  title="确认移出该成员？"
                  disabled={!canManage || row.userId === user?.id}
                  onConfirm={() => removeMember(row.id)}
                >
                  <Button
                    size="small"
                    danger
                    disabled={!canManage || row.userId === user?.id}
                  >
                    移出
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新增人员"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Tabs
          items={[
            {
              key: 'existing',
              label: '添加已有账号',
              children: (
                <Form
                  form={addForm}
                  layout="vertical"
                  initialValues={{ teamRole: TeamRole.MEMBER }}
                  onFinish={addExisting}
                >
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input placeholder="已有系统账号的用户名" />
                  </Form.Item>
                  <Form.Item
                    name="teamRole"
                    label="团队角色"
                    rules={[{ required: true }]}
                  >
                    <Select options={TEAM_ROLE_OPTIONS} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    加入团队
                  </Button>
                </Form>
              ),
            },
            ...(canCreateUser
              ? [
                  {
                    key: 'create',
                    label: '新建账号并加入',
                    children: (
                      <Form
                        form={createForm}
                        layout="vertical"
                        initialValues={{
                          teamRole: TeamRole.MEMBER,
                          roles: [GlobalRole.STAFF],
                        }}
                        onFinish={createAndAdd}
                      >
                        <Form.Item
                          name="username"
                          label="用户名"
                          rules={[{ required: true, min: 2 }]}
                        >
                          <Input placeholder="登录用户名" />
                        </Form.Item>
                        <Form.Item
                          name="password"
                          label="初始密码"
                          rules={[{ required: true, min: 6 }]}
                        >
                          <Input.Password placeholder="至少 6 位" />
                        </Form.Item>
                        <Form.Item
                          name="displayName"
                          label="姓名"
                          rules={[{ required: true }]}
                        >
                          <Input placeholder="显示名称" />
                        </Form.Item>
                        <Form.Item name="phone" label="手机号">
                          <Input placeholder="可选" maxLength={11} />
                        </Form.Item>
                        <Form.Item
                          name="teamRole"
                          label="团队角色"
                          rules={[{ required: true }]}
                        >
                          <Select options={TEAM_ROLE_OPTIONS} />
                        </Form.Item>
                        <Form.Item
                          name="roles"
                          label="系统角色"
                          rules={[{ required: true }]}
                        >
                          <Select
                            mode="multiple"
                            options={
                              hasRole(GlobalRole.SUPER_ADMIN)
                                ? Object.values(GlobalRole).map((value) => ({
                                    value,
                                    label: GLOBAL_ROLE_LABEL[value],
                                  }))
                                : STAFF_ROLE_OPTIONS
                            }
                          />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block>
                          创建并加入
                        </Button>
                      </Form>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Modal>
    </div>
  );
}
