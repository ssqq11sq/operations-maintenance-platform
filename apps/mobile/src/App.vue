<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => {
  const token = uni.getStorageSync('omp_token');
  if (!token) {
    uni.reLaunch({ url: '/pages/login/index' });
  }
});
</script>

<style>
page {
  background: #f2f5f3;
  color: #14231d;
  font-family: 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
}

/* 通用页面壳 */
.omp-page {
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  min-height: 100vh;
  box-sizing: border-box;
}

.omp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.omp-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #14231d;
}

.omp-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}

.omp-card:active {
  opacity: 0.92;
}

.omp-empty {
  margin-top: 120rpx;
  text-align: center;
  color: #7a8a83;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 0 48rpx;
}

.omp-empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: #e8f4ef;
  color: #0f6e56;
  font-size: 44rpx;
  line-height: 96rpx;
  text-align: center;
  font-weight: 700;
}

.omp-btn-primary {
  background: #0f6e56;
  color: #fff;
  border-radius: 16rpx;
  border: none;
}

.omp-btn-primary:active {
  opacity: 0.88;
}

.omp-btn-ghost {
  background: #e8f4ef;
  color: #0f6e56;
  border-radius: 16rpx;
  border: none;
}

.omp-chip {
  padding: 8rpx 18rpx;
  background: #e8eeea;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #51665c;
}

.omp-chip.active {
  background: #0f6e56;
  color: #fff;
}

.omp-status-PENDING {
  color: #d97706;
  background: #fff7ed;
}

.omp-status-IN_PROGRESS {
  color: #2563eb;
  background: #eff6ff;
}

.omp-status-COMPLETED {
  color: #0f6e56;
  background: #e8f4ef;
}

.omp-status-CLOSED {
  color: #6b7280;
  background: #f3f4f6;
}
</style>
