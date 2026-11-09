import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Rate,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import {
  WORK_ORDER_STATUS_LABEL,
  WorkOrderStatus,
  type FormFieldDef,
} from '@omp/shared';
import api from '../api';
import { useAuth } from '../auth';

const statusColor: Record<string, string> = {
  PENDING: 'gold',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CLOSED: 'default',
};

function mediaUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const teamId = user?.currentTeamId ?? undefined;
  const [list, setList] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [status, setStatus] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const fields: FormFieldDef[] = currentTemplate?.fields || [];

  const load = async () => {
    if (!teamId) {
      setList([]);
      return;
    }
    const { data } = await api.get('/work-orders', {
      params: {
        teamId,
        ...(status ? { status } : {}),
      },
    });
    setList(data);
  };

  const loadTemplates = async () => {
    if (!teamId) {
      setTemplates([]);
      return;
    }
    const { data } = await api.get('/templates', { params: { teamId } });
    setTemplates(data);
  };

  const loadMembers = async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }
    const { data } = await api.get(`/teams/${teamId}/members`);
    setMembers(data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载工单失败'));
    loadTemplates().catch(() => undefined);
    loadMembers().catch(() => undefined);
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 15000);
    return () => clearInterval(timer);
  }, [status, teamId]);

  const updateStatus = async (id: number, next: WorkOrderStatus) => {
    await api.patch(`/work-orders/${id}/status`, { status: next });
    message.success('状态已更新');
    await load();
    if (detail?.id === id) {
      setDetail({ ...detail, status: next });
    }
  };

  const openDetail = async (row: any) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/work-orders/${row.id}`);
      setDetail(data);
    } catch {
      message.error('加载详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    const first = templates[0]?.id;
    setTemplateId(first);
    form.setFieldsValue({
      templateId: first,
      title: first ? `${templates[0].name}-${new Date().toLocaleDateString()}` : '',
      assigneeId: members[0]?.userId,
    });
    setOpen(true);
  };

  const submitOrder = async () => {
    const values = await form.validateFields();
    const formData: Record<string, unknown> = {};
    fields.forEach((f) => {
      formData[f.key] = values[`field_${f.key}`];
    });
    await api.post('/work-orders', {
      templateId: values.templateId,
      title: values.title,
      assigneeId: values.assigneeId,
      formData,
    });
    message.success('工单已提交');
    setOpen(false);
    await load();
  };

  const reassign = async (assigneeId: number) => {
    if (!detail) return;
    await api.patch(`/work-orders/${detail.id}/assignee`, { assigneeId });
    message.success('已改派');
    await openDetail(detail);
    await load();
  };

  const asMediaList = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    if (v == null || v === '') return [];
    return [String(v)];
  };

  const uploadField = async (fieldKey: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const path = data.path || data.url || data.key;
    const name = `field_${fieldKey}`;
    const prev = asMediaList(form.getFieldValue(name));
    form.setFieldValue(name, [...prev, path]);
    message.success('上传成功');
    return false;
  };

  const removeUpload = (fieldKey: string, index: number) => {
    const name = `field_${fieldKey}`;
    const next = asMediaList(form.getFieldValue(name)).filter((_, i) => i !== index);
    form.setFieldValue(name, next);
  };

  const renderField = (field: FormFieldDef) => {
    const name = `field_${field.key}`;
    const rules = field.required
      ? [{ required: true, message: `请填写${field.label}` }]
      : [];
    if (field.type === 'textarea') {
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Input.TextArea rows={3} placeholder={field.placeholder} />
        </Form.Item>
      );
    }
    if (field.type === 'select') {
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Select
            options={(field.options || []).map((o) => ({
              label: o.label,
              value: o.value,
            }))
            }
            placeholder={field.placeholder || '请选择'}
          />
        </Form.Item>
      );
    }
    if (field.type === 'multiselect') {
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Select
            mode="multiple"
            options={(field.options || []).map((o) => ({
              label: o.label,
              value: o.value,
            }))}
          />
        </Form.Item>
      );
    }
    if (field.type === 'number') {
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
      );
    }
    if (field.type === 'rating') {
      return (
        <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
          <Rate count={field.max || 5} />
        </Form.Item>
      );
    }
    if (field.type === 'image' || field.type === 'file') {
      return (
        <Form.Item
          key={field.key}
          name={name}
          label={field.label}
          rules={
            field.required
              ? [
                  {
                    validator: async (_, v) => {
                      if (!asMediaList(v).length) {
                        throw new Error(`请上传${field.label}`);
                      }
                    },
                  },
                ]
              : []
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              multiple
              beforeUpload={(file) => {
                uploadField(field.key, file as File);
                return false;
              }}
              showUploadList={false}
              accept={field.type === 'image' ? 'image/*' : undefined}
            >
              <Button icon={<UploadOutlined />}>
                {field.type === 'image' ? '添加图片' : '添加附件'}
              </Button>
            </Upload>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const list = asMediaList(form.getFieldValue(name));
                if (!list.length) return null;
                if (field.type === 'image') {
                  return (
                    <Space wrap>
                      {list.map((item, idx) => (
                        <div key={`${item}_${idx}`} style={{ position: 'relative' }}>
                          <Image src={mediaUrl(item)} width={120} />
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => removeUpload(field.key, idx)}
                          >
                            删除
                          </Button>
                        </div>
                      ))}
                    </Space>
                  );
                }
                return (
                  <Space direction="vertical">
                    {list.map((item, idx) => {
                      const href = mediaUrl(item);
                      const fname = String(item).split('/').pop() || `附件${idx + 1}`;
                      return (
                        <Space key={`${item}_${idx}`}>
                          <a href={href} target="_blank" rel="noreferrer" download={fname}>
                            {fname}
                          </a>
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => removeUpload(field.key, idx)}
                          >
                            删除
                          </Button>
                        </Space>
                      );
                    })}
                  </Space>
                );
              }}
            </Form.Item>
          </Space>
        </Form.Item>
      );
    }
    return (
      <Form.Item key={field.key} name={name} label={field.label} rules={rules}>
        <Input placeholder={field.placeholder} />
      </Form.Item>
    );
  };

  const optionLabel = (field: FormFieldDef, val: unknown) => {
    const hit = (field.options || []).find(
      (o) => String(o.value) === String(val) || String(o.label) === String(val),
    );
    return hit?.label || String(val);
  };

  const renderDetailValue = (field: FormFieldDef, value: unknown) => {
    if (value == null || value === '') return '-';
    if (field.type === 'image') {
      const list = asMediaList(value);
      if (!list.length) return '-';
      return (
        <Space wrap>
          {list.map((item, idx) => (
            <Image key={`${item}_${idx}`} src={mediaUrl(item)} width={160} />
          ))}
        </Space>
      );
    }
    if (field.type === 'file') {
      const list = asMediaList(value);
      if (!list.length) return '-';
      return (
        <Space direction="vertical">
          {list.map((item, idx) => {
            const href = mediaUrl(item);
            const fname = String(item).split('/').pop() || `附件${idx + 1}`;
            const ext = (fname.split('.').pop() || '').toLowerCase();
            const office = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
            return (
              <a
                key={`${item}_${idx}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                download={office.includes(ext) ? fname : undefined}
              >
                {office.includes(ext) ? `下载 ${fname}` : fname}
              </a>
            );
          })}
        </Space>
      );
    }
    if (field.type === 'rating') {
      return <Rate disabled value={Number(value) || 0} count={field.max || 5} />;
    }
    if (field.type === 'select' || field.type === 'multiselect') {
      if (Array.isArray(value)) {
        return value.map((v) => optionLabel(field, v)).join('、') || '-';
      }
      return optionLabel(field, value);
    }
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  const detailFields: FormFieldDef[] = detail?.templateFields || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>工单管理</Typography.Title>
          <span className="page-desc">填写工单、查看详情、按状态筛选与流转</span>
        </div>
        <Space>
          <Select
            allowClear
            placeholder="筛选状态"
            style={{ width: 160 }}
            value={status}
            onChange={setStatus}
            options={Object.entries(WORK_ORDER_STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Button type="primary" onClick={openCreate}>
            填写工单
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        dataSource={list}
        locale={{ emptyText: '暂无工单' }}
        onRow={(row) => ({
          onClick: () => openDetail(row),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '标题', dataIndex: 'title' },
          { title: '模板', dataIndex: 'templateName' },
          { title: '创建人', dataIndex: 'creatorName' },
          { title: '处理人', dataIndex: 'assigneeName' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: WorkOrderStatus) => (
              <Tag color={statusColor[s]}>{WORK_ORDER_STATUS_LABEL[s]}</Tag>
            ),
          },
          {
            title: '流转',
            render: (_, row) => (
              <Select
                size="small"
                style={{ width: 120 }}
                value={row.status}
                options={Object.entries(WORK_ORDER_STATUS_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onClick={(e) => e.stopPropagation()}
                onChange={(v) => updateStatus(row.id, v)}
              />
            ),
          },
        ]}
      />

      <Modal
        title="填写工单"
        open={open}
        onOk={submitOrder}
        onCancel={() => setOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="templateId" label="工单模板" rules={[{ required: true }]}>
            <Select
              options={templates.map((t) => ({ label: t.name, value: t.id }))}
              onChange={(v) => {
                setTemplateId(v);
                const t = templates.find((x) => x.id === v);
                form.setFieldsValue({
                  title: t ? `${t.name}-${new Date().toLocaleDateString()}` : '',
                });
              }}
            />
          </Form.Item>
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="assigneeId" label="指派给">
            <Select
              allowClear
              placeholder="默认自己"
              options={members.map((m) => ({
                label: m.displayName,
                value: m.userId,
              }))}
            />
          </Form.Item>
          {fields.map((f) => renderField(f))}
        </Form>
      </Modal>

      <Drawer
        title="工单详情"
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        width={520}
        destroyOnClose
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
              <Descriptions.Item label="模板">{detail.templateName}</Descriptions.Item>
              <Descriptions.Item label="创建人">{detail.creatorName}</Descriptions.Item>
              <Descriptions.Item label="处理人">
                <Select
                  style={{ width: 180 }}
                  value={detail.assigneeId || undefined}
                  options={members.map((m) => ({
                    label: m.displayName,
                    value: m.userId,
                  }))}
                  onChange={(v) => reassign(v)}
                />
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[detail.status]}>
                  {WORK_ORDER_STATUS_LABEL[detail.status as WorkOrderStatus]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detail.createdAt
                  ? String(detail.createdAt).replace('T', ' ').slice(0, 19)
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 20 }}>
              表单内容
            </Typography.Title>
            <Descriptions column={1} size="small" bordered>
              {detailFields.length ? (
                detailFields.map((f) => (
                  <Descriptions.Item key={f.key} label={f.label}>
                    {renderDetailValue(f, detail.formData?.[f.key])}
                  </Descriptions.Item>
                ))
              ) : (
                <Descriptions.Item label="数据">
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(detail.formData || {}, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Space style={{ marginTop: 16 }} wrap>
              {Object.values(WorkOrderStatus)
                .filter((s) => s !== detail.status)
                .map((s) => (
                  <Button key={s} onClick={() => updateStatus(detail.id, s)}>
                    设为{WORK_ORDER_STATUS_LABEL[s]}
                  </Button>
                ))}
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
}
