<template>
  <view class="page">
    <view class="header">
      <text class="title">我的工单</text>
      <button size="mini" class="btn" @click="goCreate">新建</button>
    </view>
    <view class="filters">
      <text
        v-for="s in statuses"
        :key="s.value || 'all'"
        class="chip"
        :class="{ active: status === s.value }"
        @click="status = s.value; load()"
      >
        {{ s.label }}
      </text>
    </view>
    <view v-if="loading" class="empty">
      <view class="empty-icon">…</view>
      <text>加载中</text>
    </view>
    <view v-else-if="!list.length" class="empty">
      <view class="empty-icon">单</view>
      <text>暂无工单</text>
      <button size="mini" class="btn empty-btn" @click="goCreate">去填写</button>
    </view>
    <view
      v-for="item in list"
      :key="item.id"
      class="card"
      @click="goDetail(item.id)"
    >
      <view class="row">
        <text class="name">{{ item.title }}</text>
        <text class="status" :class="'st-' + item.status">{{ labelOf(item.status) }}</text>
      </view>
      <view class="meta">{{ item.templateName }} · {{ item.creatorName }}</view>
      <view class="hint">查看详情 ›</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { WORK_ORDER_STATUS_LABEL, WorkOrderStatus } from '@omp/shared';
import { request } from '../../utils/request';

const list = ref<any[]>([]);
const status = ref<string>('');
const loading = ref(false);
const statuses = [
  { label: '全部', value: '' },
  ...Object.entries(WORK_ORDER_STATUS_LABEL).map(([value, label]) => ({
    value,
    label,
  })),
];

function labelOf(s: WorkOrderStatus) {
  return WORK_ORDER_STATUS_LABEL[s] || s;
}

async function load() {
  loading.value = true;
  try {
    list.value = await request({
      url: '/work-orders',
      data: {
        mine: true,
        ...(status.value ? { status: status.value } : {}),
      },
    });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/workorders/create' });
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/workorders/detail?id=${id}` });
}

onShow(() => load());
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
  margin-bottom: 16rpx;
}
.title { font-size: 36rpx; font-weight: 700; }
.btn {
  background: #0f6e56;
  color: #fff;
  border-radius: 999rpx;
  padding: 0 24rpx;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.chip {
  padding: 10rpx 20rpx;
  background: #e8eeea;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #51665c;
}
.chip.active {
  background: #0f6e56;
  color: #fff;
}
.card {
  background: #fff;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.card:active {
  opacity: 0.94;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  align-items: flex-start;
}
.name {
  font-weight: 600;
  font-size: 30rpx;
  flex: 1;
}
.status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.st-PENDING { color: #d97706; background: #fff7ed; }
.st-IN_PROGRESS { color: #2563eb; background: #eff6ff; }
.st-COMPLETED { color: #0f6e56; background: #e8f4ef; }
.st-CLOSED { color: #6b7280; background: #f3f4f6; }
.meta {
  color: #7a8a83;
  margin-top: 10rpx;
  font-size: 24rpx;
}
.hint {
  margin-top: 12rpx;
  color: #0f6e56;
  font-size: 24rpx;
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
.empty-btn { margin-top: 8rpx; }
</style>
