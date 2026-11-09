<template>
  <view class="page">
    <view class="header">
      <text class="title">加班申请</text>
      <button size="mini" class="btn" @click="goCreate">新建</button>
    </view>
    <view class="filters">
      <text
        v-for="s in filters"
        :key="s.key"
        class="chip"
        :class="{ active: filter === s.key }"
        @click="filter = s.key; load()"
      >{{ s.label }}</text>
    </view>
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!list.length" class="empty">
      <view class="empty-icon">加</view>
      <text>暂无加班记录</text>
    </view>
    <view
      v-for="item in list"
      :key="item.id"
      class="card"
      @click="goDetail(item.id)"
    >
      <view class="row">
        <text class="name">{{ item.applicantName || '我' }}</text>
        <text class="status" :class="'st-' + item.status">{{ item.statusLabel }}</text>
      </view>
      <view class="meta">{{ fmt(item.planStartAt) }} ~ {{ fmt(item.planEndAt) }}</view>
      <view class="reason">{{ item.reason }}</view>
      <view v-if="item.actualMinutes != null" class="meta">
        实际 {{ item.actualMinutes }} 分钟
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const list = ref<any[]>([]);
const loading = ref(false);
const filter = ref<'mine' | 'pending' | 'all'>('mine');
const canApprove = ref(false);
const filters = computed(() => {
  const base = [{ key: 'mine' as const, label: '我的' }];
  if (!canApprove.value) return base;
  return [
    ...base,
    { key: 'pending' as const, label: '待我审' },
    { key: 'all' as const, label: '全部' },
  ];
});

function fmt(v?: string) {
  return (v || '').replace('T', ' ').slice(0, 16);
}

async function resolveApproveRole() {
  try {
    const user = (await request({ url: '/auth/profile' })) as any;
    uni.setStorageSync('omp_user', user);
    const roles = (user?.roles || []).map((r: any) => r.code);
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
      canApprove.value = true;
      return;
    }
    const teams = (await request({ url: '/teams/mine' })) as any[];
    const cur = teams?.find((t) => t.id === user?.currentTeamId);
    canApprove.value =
      cur?.teamRole === 'LEADER' || cur?.teamRole === 'ADMIN';
  } catch {
    canApprove.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    const data: any = {
      ...(filter.value === 'mine' ? { mine: true } : {}),
      ...(filter.value === 'pending' ? { pending: true } : {}),
    };
    list.value = await request({ url: '/overtimes', data });
  } catch (e: any) {
    list.value = [];
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/overtime/create' });
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/overtime/detail?id=${id}` });
}

onShow(async () => {
  await resolveApproveRole();
  if (!canApprove.value && filter.value !== 'mine') {
    filter.value = 'mine';
  }
  await load();
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
.card:active { opacity: 0.94; }
.row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}
.name { font-weight: 600; font-size: 30rpx; }
.status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.st-PENDING { color: #d97706; background: #fff7ed; }
.st-REJECTED { color: #b91c1c; background: #fef2f2; }
.st-APPROVED { color: #2563eb; background: #eff6ff; }
.st-PENDING_VERIFY { color: #d97706; background: #fff7ed; }
.st-VERIFY_REJECTED { color: #b91c1c; background: #fef2f2; }
.st-COMPLETED { color: #0f6e56; background: #e8f4ef; }
.meta { color: #7a8a83; margin-top: 8rpx; font-size: 24rpx; }
.reason {
  margin-top: 10rpx;
  color: #14231d;
  font-size: 26rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
