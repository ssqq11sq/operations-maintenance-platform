<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ displayName }} 当日轨迹</text>
      <text class="sub">{{ date }} · {{ points.length }} 个打卡点</text>
    </view>
    <map
      class="map"
      :latitude="centerLat"
      :longitude="centerLng"
      :scale="14"
      :polyline="polylines"
      :markers="markers"
      show-location
    />
    <view v-for="(p, idx) in points" :key="p.id" class="card" @click="preview(p.photoUrl)">
      <view class="row">
        <text>#{{ idx + 1 }} {{ formatTime(p.punchedAt) }}</text>
        <text class="link">查看照片</text>
      </view>
      <view class="meta">{{ p.address || '无地址' }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { resolveMediaUrl } from '../../utils/media';

const userId = ref(0);
const date = ref('');
const displayName = ref('');
const points = ref<any[]>([]);

const centerLat = computed(() => points.value[0]?.latitude || 31.2304);
const centerLng = computed(() => points.value[0]?.longitude || 121.4737);

const markers = computed(() =>
  points.value.map((p, idx) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    width: 24,
    height: 24,
    title: `#${idx + 1}`,
  })),
);

const polylines = computed(() => {
  if (points.value.length < 2) return [];
  return [
    {
      points: points.value.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      color: '#0f6e56',
      width: 4,
    },
  ];
});

function formatTime(v: string) {
  return (v || '').replace('T', ' ').slice(11, 19);
}

function preview(url: string) {
  if (!url) return;
  const full = resolveMediaUrl(url);
  uni.previewImage({ urls: [full], current: full });
}

async function load() {
  const data = await request({
    url: '/punches/route',
    data: { userId: userId.value, date: date.value },
  });
  displayName.value = data.displayName;
  points.value = data.points || [];
}

onLoad((query) => {
  userId.value = Number(query?.userId || 0);
  date.value = String(query?.date || new Date().toISOString().slice(0, 10));
  load().catch((e) =>
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' }),
  );
});
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.header { margin-bottom: 16rpx; }
.title { font-size: 34rpx; font-weight: 700; display: block; }
.sub { color: #7a8a83; font-size: 24rpx; margin-top: 6rpx; display: block; }
.map {
  width: 100%;
  height: 420rpx;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  border: 1px solid #dde7e2;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.card:active { opacity: 0.94; }
.row { display: flex; justify-content: space-between; }
.link { color: #0f6e56; font-size: 24rpx; }
.meta { margin-top: 8rpx; color: #51665c; font-size: 24rpx; }
</style>
