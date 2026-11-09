import path from 'path';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // 生产 H5 挂在同域 /m/，便于手机浏览器试用（未备案小程序前）
  base: process.env.NODE_ENV === 'production' ? '/m/' : '/',
  plugins: [uni(), basicSsl()],
  resolve: {
    alias: {
      '@omp/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    https: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
