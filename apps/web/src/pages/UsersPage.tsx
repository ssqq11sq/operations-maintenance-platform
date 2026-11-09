import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { GLOBAL_ROLE_LABEL, GlobalRole } from '@omp/shared';
import api from '../api';

const ROLE_OPTIONS = Object.values(GlobalRole).map((value) => ({
  value,
  label: GLOBAL_ROLE_LABEL[value],
}));

type UserRow = {
  id: number;
  username: string;
  displayName: string;
  phone?: string;
  active: boolean;
  roles: { code: GlobalRole; name: string }[];
};

export default function UsersPage() {
  const [list, setList] = useState<UserRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [current, setCurrent] = useState<UserRow | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const load = async () => {
    const { data } = await api.get('/users');
    setList(data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载用户失败'));
  }, []);

  const create = async () => {
    const values = await createForm.validateFields();
    await api.post('/users', values);
    message.success('用户已创建');
    setCreateOpen(false);
    createForm.resetFields();
    await load();
  };

  const openEdit = (row: UserRow) => {
    setCurrent(row);
    editForm.setFieldsValue({
      displayName: row.displayName,
      phone: row.phone,
      active: row.active,
      roles: row.roles?.map((r) => r.code) || [],
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!current) return;
    const values = await editForm.validateFields();
    await api.patch(`/users/${current.id}`, values);
    message.success('用户已更新');
    setEditOpen(false);
    await load();
  };

  const openPwd = (row: UserRow) => {
    setCurrent(row);
    pwdForm.resetFields();
    setPwdOpen(true);
  };

  const resetPwd = async () => {
    if (!current) return;
    const values = await pwdForm.validateFields();
    await api.post(`/users/${current.id}/reset-password`, {
      password: values.password,
    });
    message.success('密码已重置');
    setPwdOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>系统用户</Typography.Title>
          <span className="page-desc">账号、全局角色、启用状态（仅超级管理员）</span>
        </div>
        <Button
          type="primary"
          onClick={() => {
            createForm.resetFields();
            createForm.setFieldsValue({ roles: [GlobalRole.STAFF] });
            setCreateOpen(true);
          }}
        >
          新建用户
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={list}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '用户名', dataIndex: 'username' },
          { title: '显示名', dataIndex: 'displayName' },
          { title: '手机', dataIndex: 'phone', render: (v) => v || '-' },
          {
            title: '角色',
            dataIndex: 'roles',
            render: (roles: UserRow['roles']) =>
              (roles || []).map((r) => (
                <Tag key={r.code} color={r.code === GlobalRole.SUPER_ADMIN ? 'red' : 'blue'}>
                  {GLOBAL_ROLE_LABEL[r.code] || r.name}
                </Tag>
              )),
          },
          {
            title: '状态',
            dataIndex: 'active',
            render: (v: boolean) =>
              v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
          },
          {
            title: '操作',
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => openEdit(row)}>
                  编辑
                </Button>
                <Button size="small" onClick={() => openPwd(row)}>
                  重置密码
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建用户"
        open={createOpen}
        onOk={create}
        onCancel={() => setCreateOpen(false)}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="displayName" label="显示名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="roles" label="全局角色" rules={[{ required: true }]}>
            <Select mode="multiple" options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑用户"
        open={editOpen}
        onOk={saveEdit}
        onCancel={() => setEditOpen(false)}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="displayName" label="显示名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input />
          </Form.Item>
          <Form.Item name="roles" label="全局角色" rules={[{ required: true }]}>
            <Select mode="multiple" options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`重置密码${current ? `：${current.username}` : ''}`}
        open={pwdOpen}
        onOk={resetPwd}
        onCancel={() => setPwdOpen(false)}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
