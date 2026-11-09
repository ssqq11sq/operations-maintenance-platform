import { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  OVERTIME_STATUS_LABEL,
  OvertimeStatus,
} from '@omp/shared';
import api from '../api';

const statusColor: Record<string, string> = {
  PENDING: 'gold',
  REJECTED: 'red',
  APPROVED: 'blue',
  PENDING_VERIFY: 'orange',
  VERIFY_REJECTED: 'red',
  COMPLETED: 'green',
};

function mediaUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

function fmt(v?: string | null) {
  if (!v) return '-';
  return String(v).replace('T', ' ').slice(0, 19);
}

export default function OvertimePage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [pendingOnly, setPendingOnly] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState<'approve' | 'verify'>('approve');
  const [rejectForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/overtimes', {
        params: {
          status,
          pending: pendingOnly ? true : undefined,
        },
      });
      setList(data);
    } catch {
      message.error('加载加班记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, pendingOnly]);

  const openDetail = async (id: number) => {
    const { data } = await api.get(`/overtimes/${id}`);
    setDetail(data);
  };

  const doApprove = async (pass: boolean, reason?: string) => {
    if (!detail) return;
    await api.patch(`/overtimes/${detail.id}/approve`, { pass, reason });
    message.success(pass ? '已通过' : '已退回');
    setRejectOpen(false);
    await openDetail(detail.id);
    await load();
  };

  const doVerify = async (pass: boolean, reason?: string) => {
    if (!detail) return;
    await api.patch(`/overtimes/${detail.id}/verify`, { pass, reason });
    message.success(pass ? '已完成' : '已退回');
    setRejectOpen(false);
    await openDetail(detail.id);
    await load();
  };

  const openReject = (mode: 'approve' | 'verify') => {
    setRejectMode(mode);
    rejectForm.resetFields();
    setRejectOpen(true);
  };

  const submitReject = async () => {
    const values = await rejectForm.validateFields();
    if (rejectMode === 'approve') await doApprove(false, values.reason);
    else await doVerify(false, values.reason);
  };

  const exportExcel = async () => {
    const res = await api.get('/overtimes/export', {
      params: {
        status,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to: range?.[1]?.format('YYYY-MM-DD'),
      },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'overtime-report.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>加班管理</Typography.Title>
          <span className="page-desc">
            审批加班申请、核验实际打卡，并导出报表
          </span>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
            options={Object.entries(OVERTIME_STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            style={{ width: 140 }}
            value={pendingOnly ? 'pending' : 'all'}
            onChange={(v) => setPendingOnly(v === 'pending')}
            options={[
              { value: 'all', label: '全部记录' },
              { value: 'pending', label: '待我审批' },
            ]}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          />
          <Button onClick={exportExcel}>导出报表</Button>
          <Button onClick={() => load()}>刷新</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        locale={{ emptyText: '暂无加班记录' }}
        onRow={(row) => ({
          onClick: () => openDetail(row.id),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '申请人', dataIndex: 'applicantName' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: OvertimeStatus) => (
              <Tag color={statusColor[s]}>{OVERTIME_STATUS_LABEL[s]}</Tag>
            ),
          },
          {
            title: '计划时间',
            render: (_, r) => `${fmt(r.planStartAt)} ~ ${fmt(r.planEndAt)}`,
          },
          {
            title: '计划时长',
            dataIndex: 'planMinutes',
            render: (v) => (v != null ? `${v} 分钟` : '-'),
          },
          {
            title: '实际时长',
            dataIndex: 'actualMinutes',
            render: (v) => (v != null ? `${v} 分钟` : '-'),
          },
          {
            title: '事由',
            dataIndex: 'reason',
            ellipsis: true,
          },
        ]}
      />

      <Drawer
        title="加班详情"
        width={520}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[detail.status]}>
                  {detail.statusLabel}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="申请人">
                {detail.applicantName}
              </Descriptions.Item>
              <Descriptions.Item label="计划开始">
                {fmt(detail.planStartAt)}
              </Descriptions.Item>
              <Descriptions.Item label="计划结束">
                {fmt(detail.planEndAt)}
              </Descriptions.Item>
              <Descriptions.Item label="计划时长">
                {detail.planMinutes != null ? `${detail.planMinutes} 分钟` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="事由">{detail.reason}</Descriptions.Item>
              {detail.rejectReason ? (
                <Descriptions.Item label="申请退回理由">
                  {detail.rejectReason}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="实际开始">
                {fmt(detail.actualStartAt)}
              </Descriptions.Item>
              <Descriptions.Item label="实际结束">
                {fmt(detail.actualEndAt)}
              </Descriptions.Item>
              <Descriptions.Item label="实际时长">
                {detail.actualMinutes != null
                  ? `${detail.actualMinutes} 分钟`
                  : '-'}
              </Descriptions.Item>
              {detail.verifyRejectReason ? (
                <Descriptions.Item label="核验退回理由">
                  {detail.verifyRejectReason}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            {(detail.photoUrls || []).length ? (
              <Space wrap style={{ marginTop: 16 }}>
                {(detail.photoUrls as string[]).map((u, i) => (
                  <Image key={i} src={mediaUrl(u)} width={120} />
                ))}
              </Space>
            ) : null}

            <Space style={{ marginTop: 24 }}>
              {detail.status === OvertimeStatus.PENDING ? (
                <>
                  <Button type="primary" onClick={() => doApprove(true)}>
                    通过申请
                  </Button>
                  <Button danger onClick={() => openReject('approve')}>
                    退回
                  </Button>
                </>
              ) : null}
              {detail.status === OvertimeStatus.PENDING_VERIFY ? (
                <>
                  <Button type="primary" onClick={() => doVerify(true)}>
                    核验通过
                  </Button>
                  <Button danger onClick={() => openReject('verify')}>
                    退回补录
                  </Button>
                </>
              ) : null}
            </Space>
          </>
        ) : null}
      </Drawer>

      <Modal
        title="填写退回理由"
        open={rejectOpen}
        onOk={submitReject}
        onCancel={() => setRejectOpen(false)}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="理由"
            rules={[{ required: true, message: '请填写退回理由' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
