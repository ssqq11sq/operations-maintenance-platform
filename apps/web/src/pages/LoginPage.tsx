import { Button, Card, Form, Input, Tabs, Typography, message } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import { apiErrorMessage } from '../utils/apiError';

export default function LoginPage() {
  const { login, loginWithToken, token } = useAuth();
  const navigate = useNavigate();

  if (token) return <Navigate to="/" replace />;

  const onPasswordLogin = async (values: {
    username: string;
    password: string;
  }) => {
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (e: any) {
      message.error(apiErrorMessage(e, '登录失败'));
    }
  };

  const onRegister = async (values: {
    username: string;
    password: string;
    displayName: string;
    phone?: string;
  }) => {
    try {
      const { data } = await api.post('/auth/register', {
        ...values,
        phone: values.phone || undefined,
      });
      loginWithToken(data.accessToken, data.user);
      message.success('注册成功，请加入团队后使用');
      navigate('/teams');
    } catch (e: any) {
      message.error(apiErrorMessage(e, '注册失败'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(700px 320px at 85% 10%, rgba(201,235,224,0.35), transparent 55%), linear-gradient(145deg, #0f6e56 0%, #1a3c34 45%, #0b1f2a 100%)',
      }}
    >
      <Card
        style={{
          width: 440,
          maxWidth: '100%',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          border: 'none',
        }}
        styles={{ body: { padding: '32px 28px' } }}
      >
        <Typography.Title
          level={2}
          style={{ marginBottom: 4, color: '#0f6e56', letterSpacing: 0.5 }}
        >
          运维管理系统
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          管理后台 · 登录 / 自助注册
        </Typography.Paragraph>

        <Tabs
          items={[
            {
              key: 'password',
              label: '账号密码',
              children: (
                <Form layout="vertical" onFinish={onPasswordLogin}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true }]}
                  >
                    <Input size="large" placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[{ required: true }]}
                  >
                    <Input.Password size="large" placeholder="密码" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" size="large" block>
                    登录
                  </Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '自助注册',
              children: (
                <Form layout="vertical" onFinish={onRegister}>
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      {
                        pattern: /^[a-zA-Z0-9_]{3,32}$/,
                        message: '3–32 位字母、数字或下划线',
                      },
                    ]}
                  >
                    <Input size="large" placeholder="登录用户名" />
                  </Form.Item>
                  <Form.Item
                    name="displayName"
                    label="显示名称"
                    rules={[{ required: true, message: '请输入显示名称' }]}
                  >
                    <Input size="large" placeholder="姓名或昵称" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '至少 6 位' },
                    ]}
                  >
                    <Input.Password size="large" placeholder="至少 6 位" />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="手机号（选填）"
                    rules={[
                      {
                        pattern: /^1\d{10}$/,
                        message: '手机号格式不正确',
                      },
                    ]}
                  >
                    <Input size="large" placeholder="可选" maxLength={11} />
                  </Form.Item>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ fontSize: 12, marginTop: -8 }}
                  >
                    注册后默认无团队，需在「团队管理」用邀请码加入。
                  </Typography.Paragraph>
                  <Button type="primary" htmlType="submit" size="large" block>
                    注册并登录
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
