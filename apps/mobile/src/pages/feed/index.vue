<template>
  <view class="page">
    <view class="header">
      <text class="title">今日工作圈</text>
      <text class="refresh" @click="load">刷新</text>
    </view>
    <view v-if="loading" class="empty">
      <view class="empty-icon">…</view>
      <text>加载中</text>
    </view>
    <view v-else-if="!list.length" class="empty">
      <view class="empty-icon">○</view>
      <text>暂无打卡动态</text>
      <button size="mini" class="go-btn" @click="goPunch">去打卡</button>
    </view>
    <view v-for="item in list" :key="item.id" class="card" @click="goRoute(item)">
      <view class="row">
        <view class="avatar">{{ (item.displayName || '?').slice(0, 1) }}</view>
        <view class="info">
          <view class="row-top">
            <text class="name">{{ item.displayName }}</text>
            <text class="time">{{ formatTime(item.punchedAt) }}</text>
          </view>
          <view class="meta">{{ item.title || '现场打卡' }} · {{ item.address || '未知地址' }}</view>
        </view>
      </view>
      <image
        class="photo"
        :src="resolveMediaUrl(item.photoUrl)"
        mode="aspectFill"
        @click.stop="preview(item.photoUrl)"
      />
      <view class="link">查看当日完整路线 ›</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { resolveMediaUrl } from '../../utils/media';

const list = ref<any[]>([]);
const loading = ref(false);

function formatTime(v: string) {
  return (v || '').replace('T', ' ').slice(11, 19) || (v || '').replace('T', ' ').slice(0, 19);
}

async function load() {
  loading.value = true;
  try {
    list.value = await request({ url: '/punches/feed/today' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function preview(url: string) {
  const full = resolveMediaUrl(url);
  uni.previewImage({ urls: [full], current: full });
}

function goRoute(item: any) {
  const date = (item.punchedAt || '').slice(0, 10);
  uni.navigateTo({
    url: `/pages/route/index?userId=${item.userId}&date=${date}`,
  });
}

function goPunch() {
  uni.switchTab({ url: '/pages/punch/index' });
}

onShow(() => {
  load();
});
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 700;
}
.refresh {
  color: #0f6e56;
  font-size: 26rpx;
  padding: 8rpx 12rpx;
}
.empty {
  margin-top: 120rpx;
  text-align: center;
  color: #7a8a83;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: #e8f4ef;
  color: #0f6e56;
  font-size: 40rpx;
  line-height: 96rpx;
  text-align: center;
  font-weight: 700;
}
.go-btn {
  background: #0f6e56;
  color: #fff;
  border-radius: 999rpx;
  padding: 0 28rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.card:active {
  opacity: 0.94;
}
.row {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #e8f4ef;
  color: #0f6e56;
  font-weight: 700;
  font-size: 30rpx;
  line-height: 72rpx;
  text-align: center;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.row-top {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}
.name {
  font-weight: 600;
  font-size: 28rpx;
}
.time {
  color: #7a8a83;
  font-size: 22rpx;
  flex-shrink: 0;
}
.meta {
  margin-top: 6rpx;
  color: #51665c;
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.photo {
  width: 100%;
  height: 360rpx;
  border-radius: 16rpx;
  background: #e8eeea;
  margin-top: 16rpx;
}
.link {
  margin-top: 14rpx;
  color: #0f6e56;
  font-size: 24rpx;
}
</style>
