import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { AuthProvider } from './auth';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#0f6e56',
        colorInfo: '#0f6e56',
        colorSuccess: '#0f6e56',
        borderRadius: 10,
        borderRadiusLG: 16,
        fontFamily:
          '"IBM Plex Sans", "Noto Sans SC", system-ui, -apple-system, sans-serif',
        colorText: '#14231d',
        colorTextSecondary: '#51665c',
        colorBorder: '#dde7e2',
        colorBgContainer: '#ffffff',
      },
    }}
  >
    <AuthProvider>
      <App />
    </AuthProvider>
  </ConfigProvider>,
);
