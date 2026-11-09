import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import { useOutletContext } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import { apiErrorMessage } from '../utils/apiError';

type Team = {
  id: number;
  name: string;
  description?: string;
  inviteCode: string;
  active?: boolean;
  teamRole?: string;
  canEdit?: boolean;
};

export default function TeamsPage() {
  const { refreshProfile } = useAuth();
  const { teams, reloadTeams } = useOutletContext<{
    teams: Team[];
    reloadTeams: () => Promise<void>;
  }>();
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [joinForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [list, setList] = useState<Team[]>(teams);

  useEffect(() => setList(teams), [teams]);

  const createTeam = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.post('/teams', values);
      message.success('团队已创建');
      setOpen(false);
      form.resetFields();
      await reloadTeams();
      await refreshProfile();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(apiErrorMessage(e, '创建团队失败'));
    } finally {
      setSaving(false);
    }
  };

  const joinTeam = async () => {
    try {
      const values = await joinForm.validateFields();
      setSaving(true);
      await api.post('/teams/join', values);
      message.success('已加入团队');
      setJoinOpen(false);
      joinForm.resetFields();
      await reloadTeams();
      await refreshProfile();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(apiErrorMessage(e, '加入团队失败'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: Team) => {
    setEditing(row);
    editForm.setFieldsValue({
      name: row.name,
      description: row.description,
      active: row.active !== false,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await api.patch(`/teams/${editing.id}`, values);
      message.success('团队已更新');
      setEditing(null);
      await reloadTeams();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(apiErrorMessage(e, '更新失败'));
    } finally {
      setSaving(false);
    }
  };

  const resetInvite = async (id: number) => {
    try {
      const { data } = await api.post(`/teams/${id}/reset-invite`);
      message.success(`新邀请码：${data.inviteCode}`);
      await reloadTeams();
    } catch (e: any) {
      message.error(apiErrorMessage(e, '重置邀请码失败'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>团队管理</Typography.Title>
          <span className="page-desc">
            创建或加入团队；仅团队长/管理员可编辑团队信息
          </span>
        </div>
        <Space>
          <Button onClick={() => setJoinOpen(true)}>加入团队</Button>
          <Button type="primary" onClick={() => setOpen(true)}>
            创建团队
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        dataSource={list}
        locale={{ emptyText: '暂无团队' }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '团队名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
          { title: '邀请码', dataIndex: 'inviteCode' },
          {
            title: '状态',
            dataIndex: 'active',
            render: (v: boolean) => (v === false ? '停用' : '启用'),
          },
          {
            title: '我的角色',
            dataIndex: 'teamRole',
            width: 100,
            render: (v?: string) =>
              v === 'LEADER'
                ? '团队长'
                : v === 'ADMIN'
                  ? '管理员'
                  : v === 'MEMBER'
                    ? '成员'
                    : '-',
          },
          {
            title: '操作',
            width: 220,
            render: (_, row) =>
              row.canEdit ? (
                <Space>
                  <Button size="small" onClick={() => openEdit(row)}>
                    编辑
                  </Button>
                  <Popconfirm
                    title="重置后旧邀请码将失效，确认？"
                    onConfirm={() => resetInvite(row.id)}
                  >
                    <Button size="small">重置邀请码</Button>
                  </Popconfirm>
                </Space>
              ) : (
                <Typography.Text type="secondary">
                  仅团队长/管理员可编辑
                </Typography.Text>
              ),
          },
        ]}
      />

      <Modal
        title="创建团队"
        open={open}
        onOk={createTeam}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="团队名称"
            rules={[{ required: true, message: '请填写团队名称' }]}
          >
            <Input placeholder="如：运维一组" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="加入团队"
        open={joinOpen}
        onOk={joinTeam}
        confirmLoading={saving}
        onCancel={() => setJoinOpen(false)}
        destroyOnClose
      >
        <Form form={joinForm} layout="vertical">
          <Form.Item
            name="inviteCode"
            label="邀请码"
            rules={[{ required: true, message: '请填写邀请码' }]}
          >
            <Input placeholder="请输入团队邀请码" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑团队"
        open={!!editing}
        onOk={saveEdit}
        confirmLoading={saving}
        onCancel={() => setEditing(null)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="团队名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
