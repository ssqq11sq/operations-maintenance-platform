import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useOutletContext } from 'react-router-dom';
import { GlobalRole, type FormFieldDef } from '@omp/shared';
import api from '../api';
import { useAuth } from '../auth';
import { apiErrorMessage } from '../utils/apiError';
import TemplateFieldEditor, {
  normalizeTemplateFields,
  sanitizeFieldsForSave,
} from '../components/TemplateFieldEditor';

const DEFAULT_FIELDS: FormFieldDef[] = [
  {
    key: 'deviceName',
    label: '设备名称',
    type: 'text',
    required: true,
    placeholder: '如：核心交换机-A01',
  },
  {
    key: 'result',
    label: '结果',
    type: 'select',
    required: true,
    options: [
      { label: '正常', value: '正常' },
      { label: '异常', value: '异常' },
    ],
  },
  {
    key: 'issues',
    label: '问题描述',
    type: 'textarea',
  },
];

type TeamOpt = {
  id: number;
  name: string;
  canEdit?: boolean;
  teamRole?: string;
};

export default function TemplatesPage() {
  const { user, hasRole } = useAuth();
  const { teams } = useOutletContext<{ teams: TeamOpt[] }>();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [createFields, setCreateFields] = useState<FormFieldDef[]>(DEFAULT_FIELDS);
  const [editFields, setEditFields] = useState<FormFieldDef[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const teamId = user?.currentTeamId ?? null;
  const currentTeam = useMemo(
    () => (teams || []).find((t) => t.id === teamId) || null,
    [teams, teamId],
  );
  const canEdit =
    hasRole(GlobalRole.SUPER_ADMIN) || !!currentTeam?.canEdit;

  const load = async () => {
    if (!teamId) {
      setList([]);
      return;
    }
    const { data } = await api.get('/templates', {
      params: { teamId, includeInactive: true },
    });
    setList(
      (data || []).map((row: any) => ({
        ...row,
        fields: normalizeTemplateFields(row.fields),
      })),
    );
  };

  useEffect(() => {
    load().catch(() => message.error('加载模板失败'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const validateFields = (fieldList: FormFieldDef[]) => {
    if (!fieldList.length) {
      message.error('请至少添加一个字段');
      return false;
    }
    if (fieldList.some((f) => !f.label.trim())) {
      message.error('字段显示名称不能为空');
      return false;
    }
    for (const f of fieldList) {
      if (f.type === 'select' || f.type === 'multiselect') {
        const opts = (f.options || []).filter((o) => o.label.trim());
        if (!opts.length) {
          message.error(`字段「${f.label}」请至少配置一个选项`);
          return false;
        }
      }
    }
    return true;
  };

  const create = async () => {
    if (!teamId) {
      message.error('请先选择或加入团队');
      return;
    }
    try {
      const values = await form.validateFields();
      const fields = sanitizeFieldsForSave(createFields);
      if (!validateFields(fields)) return;
      setSaving(true);
      await api.post('/templates', {
        teamId,
        name: values.name,
        description: values.description,
        fields,
      });
      message.success('模板已创建（仅当前团队可用）');
      setOpen(false);
      form.resetFields();
      setCreateFields(DEFAULT_FIELDS);
      await load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(apiErrorMessage(e, '创建模板失败'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: any) => {
    const fields = normalizeTemplateFields(row.fields);
    setEditing(row);
    setEditFields(fields.length ? fields : [...DEFAULT_FIELDS]);
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
      const fields = sanitizeFieldsForSave(editFields);
      if (!validateFields(fields)) return;
      setSaving(true);
      await api.patch(`/templates/${editing.id}`, {
        name: values.name,
        description: values.description,
        active: values.active,
        fields,
      });
      message.success('模板已更新');
      setEditing(null);
      setEditFields([]);
      await load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(apiErrorMessage(e, '保存模板失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>工单模板</Typography.Title>
          <span className="page-desc">
            模板按团队隔离；团队长/管理员可编辑，切换顶部团队后列表随之变化
          </span>
        </div>
        {canEdit && teamId ? (
          <Button
            type="primary"
            onClick={() => {
              setCreateFields(DEFAULT_FIELDS);
              form.resetFields();
              setOpen(true);
            }}
          >
            新建模板
          </Button>
        ) : null}
      </div>

      {!teamId ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="尚未选择团队"
          description="请先在顶部切换或加入团队，工单模板会随当前团队加载。"
        />
      ) : (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前团队：${currentTeam?.name || `#${teamId}`}`}
          description={
            canEdit
              ? '您是团队长或管理员，可为该团队新建/编辑模板。'
              : '您不是团队长/管理员，仅可查看模板。'
          }
        />
      )}

      <Table
        rowKey="id"
        dataSource={list}
        locale={{
          emptyText: teamId ? '当前团队暂无模板' : '请先选择团队',
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '名称', dataIndex: 'name' },
          {
            title: '所属团队',
            dataIndex: 'teamName',
            render: (v: string) => v || currentTeam?.name || '-',
          },
          { title: '描述', dataIndex: 'description' },
          {
            title: '字段数',
            dataIndex: 'fields',
            render: (f: unknown[]) => f?.length || 0,
          },
          {
            title: '状态',
            dataIndex: 'active',
            render: (v: boolean) =>
              v === false ? <Tag>停用</Tag> : <Tag color="green">启用</Tag>,
          },
          {
            title: '操作',
            width: 100,
            render: (_, row) =>
              canEdit ? (
                <Button size="small" type="link" onClick={() => openEdit(row)}>
                  编辑
                </Button>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
        ]}
      />

      <Modal
        title={`新建工单模板（${currentTeam?.name || '当前团队'}）`}
        open={open}
        onOk={create}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        width={860}
        destroyOnClose
        okText="创建"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请填写模板名称' }]}
          >
            <Input placeholder="如：设备巡检工单" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="表单字段" required>
            <TemplateFieldEditor value={createFields} onChange={setCreateFields} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编辑工单模板${editing ? ` #${editing.id}` : ''}`}
        open={!!editing}
        onOk={saveEdit}
        confirmLoading={saving}
        onCancel={() => {
          setEditing(null);
          setEditFields([]);
        }}
        width={860}
        destroyOnClose
        okText="保存"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请填写模板名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
          <Form.Item name="active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="表单字段" required>
            <TemplateFieldEditor value={editFields} onChange={setEditFields} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
