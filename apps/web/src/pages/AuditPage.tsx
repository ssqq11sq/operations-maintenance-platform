import { useEffect, useState } from 'react';
import { Select, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import api from '../api';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit-logs', {
        params: { page: p, pageSize: 20, resource },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      message.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    setPage(1);
  }, [resource]);

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>操作审计</Typography.Title>
          <span className="page-desc">记录写操作（创建/更新/删除），管理员可见</span>
        </div>
        <Select
          allowClear
          placeholder="资源类型"
          style={{ width: 160 }}
          value={resource}
          onChange={setResource}
          options={[
            { label: '工单', value: 'work-order' },
            { label: '模板', value: 'template' },
            { label: '打卡', value: 'punch' },
            { label: '团队', value: 'team' },
            { label: '用户', value: 'user' },
            { label: '认证', value: 'auth' },
          ]}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        locale={{ emptyText: '暂无审计记录' }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => {
            setPage(p);
            load(p);
          },
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          {
            title: '时间',
            dataIndex: 'createdAt',
            width: 170,
            render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
          },
          { title: '操作人', dataIndex: 'actorName', width: 120 },
          { title: '动作', dataIndex: 'action', width: 90 },
          { title: '资源', dataIndex: 'resource', width: 110 },
          { title: '资源ID', dataIndex: 'resourceId', width: 90 },
          {
            title: '详情',
            dataIndex: 'detail',
            ellipsis: true,
            render: (d) => (d ? JSON.stringify(d) : '-'),
          },
        ]}
      />
    </div>
  );
}
