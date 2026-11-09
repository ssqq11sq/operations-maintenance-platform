import { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api';

export default function StatsPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const { data: overview } = await api.get('/stats/overview', {
      params: {
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
      },
    });
    setData(overview);
  };

  useEffect(() => {
    load().catch(() => message.error('加载统计失败'));
  }, []);

  const exportExcel = async () => {
    const res = await api.get('/stats/export', {
      params: {
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
      },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omp-report.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Typography.Title level={4}>统计分析</Typography.Title>
          <span className="page-desc">工单完成率、处理时长与打卡出勤</span>
        </div>
        <Space>
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => v && setRange(v as [Dayjs, Dayjs])}
          />
          <Button onClick={() => load().catch(() => message.error('加载失败'))}>查询</Button>
          <Button type="primary" onClick={exportExcel}>
            导出 Excel
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="stat-card stat-card--accent">
            <Statistic title="工单总量" value={data?.workOrders?.total ?? '-'} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="完成率" value={data?.workOrders?.completionRate ?? '-'} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均处理时长"
              value={data?.workOrders?.avgHandleMinutes ?? '-'}
              suffix="分钟"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="打卡出勤率" value={data?.punches?.attendanceRate ?? '-'} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="状态分布">
        <pre style={{ margin: 0 }}>
          {JSON.stringify(data?.workOrders?.byStatus || {}, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
