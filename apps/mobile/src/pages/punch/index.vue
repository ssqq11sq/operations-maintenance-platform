<template>
  <view class="page">
    <view class="form">
      <view class="section-title">基本信息</view>
      <input v-model="title" class="input" placeholder="大标题（项目名称）" />
      <input v-model="subtitle" class="input" placeholder="小标题（设备/机房）" />
      <input v-model="remark" class="input" placeholder="备注" />

      <view class="section-title">定位</view>
      <view class="locate-bar">
        <view class="locate-main">
          <text class="locate-label">当前位置</text>
          <text class="coord">
            {{
              latitude && longitude
                ? `${longitude.toFixed(5)}, ${latitude.toFixed(5)}`
                : '尚未获取坐标'
            }}
          </text>
        </view>
        <button class="locate-btn" size="mini" :loading="locating" @click="locate">
          重新定位
        </button>
      </view>
      <input v-model="address" class="input" placeholder="地址或门牌号（可手动修改）" />
      <view v-if="locateHint" class="hint">{{ locateHint }}</view>

      <view class="section-title">水印要素</view>
      <view class="checks">
        <label
          v-for="item in watermarkFields"
          :key="item.key"
          class="check"
          @click="toggleOption(item.key)"
        >
          <checkbox :checked="wmOptions[item.key]" color="#0f6e56" />
          <text>{{ item.label }}</text>
        </label>
      </view>

      <button class="btn" :loading="loading" @click="takePhoto">拍照打卡</button>
      <button
        v-if="pendingCount"
        class="ghost"
        @click="syncOffline"
      >
        同步离线打卡（{{ pendingCount }}）
      </button>
    </view>
    <view v-if="preview" class="preview-wrap">
      <image :src="preview" class="preview" mode="widthFix" />
    </view>
    <canvas
      canvas-id="wmCanvas"
      class="canvas"
      :style="{ width: '750px', height: '1000px' }"
    />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import {
  DEFAULT_WATERMARK_OPTIONS,
  WATERMARK_FIELD_LABEL,
  type WatermarkFieldKey,
  type WatermarkOptions,
} from '@omp/shared';
import { request, uploadFile } from '../../utils/request';
import { composeWatermark, formatNow } from '../../utils/watermark';
import { getDeviceLocation } from '../../utils/location';
import {
  enqueuePunch,
  flushQueue,
  loadQueue,
} from '../../utils/offline-queue';

const STORAGE_KEY = 'omp_watermark_options';

const title = ref('现场巡检');
const subtitle = ref('');
const remark = ref('');
const address = ref('');
const latitude = ref(0);
const longitude = ref(0);
const preview = ref('');
const loading = ref(false);
const locating = ref(false);
const locateHint = ref('');
const pendingCount = ref(0);

const wmOptions = reactive<WatermarkOptions>({ ...DEFAULT_WATERMARK_OPTIONS });

const watermarkFields = (
  Object.keys(WATERMARK_FIELD_LABEL) as WatermarkFieldKey[]
).map((key) => ({
  key,
  label: WATERMARK_FIELD_LABEL[key],
}));

function loadWmOptions() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      Object.assign(wmOptions, DEFAULT_WATERMARK_OPTIONS, saved);
    }
  } catch {
    // ignore
  }
}

function toggleOption(key: WatermarkFieldKey) {
  wmOptions[key] = !wmOptions[key];
  uni.setStorageSync(STORAGE_KEY, { ...wmOptions });
}

async function locate() {
  locating.value = true;
  locateHint.value = '';
  try {
    const res = await getDeviceLocation();
    latitude.value = res.latitude;
    longitude.value = res.longitude;
    if (!address.value || address.value.startsWith('经纬度')) {
      address.value = res.address;
    }
    locateHint.value = res.geoHint
      ? `定位成功。地址解析提示：${res.geoHint}`
      : '定位成功';
    uni.showToast({ title: '定位成功', icon: 'success' });
  } catch (e: any) {
    const msg = e?.message || '定位失败';
    locateHint.value = msg;
    if (!latitude.value && !longitude.value) {
      latitude.value = 31.2304;
      longitude.value = 121.4737;
    }
    if (!address.value) {
      address.value = '请手动填写现场地址';
    }
    uni.showToast({ title: '定位失败，可手动填地址', icon: 'none', duration: 2500 });
  } finally {
    locating.value = false;
  }
}

async function takePhoto() {
  if (!address.value.trim()) {
    uni.showToast({ title: '请填写打卡地址', icon: 'none' });
    return;
  }
  if (!latitude.value && !longitude.value) {
    await locate();
  }
  loading.value = true;
  try {
    const choose = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sourceType: ['camera', 'album'],
          success: resolve,
          fail: reject,
        });
      },
    );
    const path = choose.tempFilePaths[0];
    const user = uni.getStorageSync('omp_user') || {};
    const watermarked = await composeWatermark('wmCanvas', path, {
      title: title.value,
      subtitle: subtitle.value,
      address: address.value,
      displayName: user.displayName,
      timeText: formatNow(),
      remark: remark.value,
      options: { ...wmOptions },
    });
    preview.value = watermarked;
    const punchedAt = new Date().toISOString();
    try {
      const uploaded = await uploadFile(watermarked, user.currentTeamId);
      await request({
        url: '/punches',
        method: 'POST',
        data: {
          latitude: latitude.value || 31.2304,
          longitude: longitude.value || 121.4737,
          address: address.value,
          title: title.value,
          subtitle: subtitle.value,
          remark: remark.value,
          photoUrl: uploaded.path || uploaded.url,
          punchedAt,
        },
      });
      uni.showToast({ title: '打卡成功', icon: 'success' });
    } catch {
      const n = enqueuePunch({
        localPhoto: watermarked,
        payload: {
          latitude: latitude.value || 31.2304,
          longitude: longitude.value || 121.4737,
          address: address.value,
          title: title.value,
          subtitle: subtitle.value,
          remark: remark.value,
          punchedAt,
          teamId: user.currentTeamId,
        },
      });
      pendingCount.value = n;
      uni.showToast({
        title: `网络异常，已离线缓存（${n}）`,
        icon: 'none',
        duration: 2500,
      });
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '打卡失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function syncOffline() {
  const before = loadQueue().length;
  if (!before) {
    uni.showToast({ title: '无离线打卡', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '同步中' });
  try {
    const { ok, fail } = await flushQueue(uploadFile, request);
    pendingCount.value = loadQueue().length;
    uni.hideLoading();
    uni.showToast({
      title: `同步成功 ${ok}，失败 ${fail}`,
      icon: 'none',
    });
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '同步失败', icon: 'none' });
  }
}

onShow(async () => {
  loadWmOptions();
  pendingCount.value = loadQueue().length;
  if (pendingCount.value) {
    const { ok } = await flushQueue(uploadFile, request).catch(() => ({
      ok: 0,
      fail: pendingCount.value,
    }));
    pendingCount.value = loadQueue().length;
    if (ok) {
      uni.showToast({ title: `已同步 ${ok} 条离线打卡`, icon: 'none' });
    }
  }
  locate();
});
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.form {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #14231d;
  margin: 8rpx 0 16rpx;
}
.section-title:first-child {
  margin-top: 0;
}
.input {
  background: #f3f6f4;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.locate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  background: #e8f4ef;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}
.locate-main {
  flex: 1;
  min-width: 0;
}
.locate-label {
  display: block;
  font-size: 22rpx;
  color: #0f6e56;
  margin-bottom: 4rpx;
}
.coord {
  color: #51665c;
  font-size: 24rpx;
  word-break: break-all;
}
.locate-btn {
  background: #fff;
  color: #0f6e56;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.hint {
  color: #b45309;
  font-size: 24rpx;
  line-height: 1.5;
  margin-bottom: 16rpx;
}
.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 24rpx;
  margin-bottom: 28rpx;
}
.check {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #14231d;
}
.ghost {
  background: #e8f4ef;
  color: #0f6e56;
  margin-top: 16rpx;
  border-radius: 14rpx;
}
.btn {
  background: #0f6e56;
  color: #fff;
  border-radius: 16rpx;
  font-weight: 600;
  font-size: 32rpx;
  padding: 8rpx 0;
}
.btn:active {
  opacity: 0.88;
}
.preview-wrap {
  margin-top: 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid #dde7e2;
  background: #fff;
}
.preview {
  width: 100%;
  display: block;
}
.canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}
</style>
