<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!detail" class="empty">记录不存在</view>
    <view v-else class="card">
      <view class="title-row">
        <text class="title">加班详情 #{{ detail.id }}</text>
        <text class="status" :class="'st-' + detail.status">{{ detail.statusLabel }}</text>
      </view>
      <view class="meta">申请人：{{ detail.applicantName }}</view>

      <view class="section">计划加班</view>
      <view class="line">开始：{{ fmt(detail.planStartAt) }}</view>
      <view class="line">结束：{{ fmt(detail.planEndAt) }}</view>
      <view class="line">时长：{{ detail.planMinutes ?? '-' }} 分钟</view>
      <view class="line">事由：{{ detail.reason }}</view>
      <view v-if="detail.rejectReason" class="warn">退回理由：{{ detail.rejectReason }}</view>

      <view v-if="detail.actualStartAt" class="section">实际加班</view>
      <view v-if="detail.actualStartAt" class="line">开始：{{ fmt(detail.actualStartAt) }}</view>
      <view v-if="detail.actualEndAt" class="line">结束：{{ fmt(detail.actualEndAt) }}</view>
      <view v-if="detail.actualMinutes != null" class="line">
        时长：{{ detail.actualMinutes }} 分钟
      </view>
      <view v-if="detail.verifyRejectReason" class="warn">
        核验退回：{{ detail.verifyRejectReason }}
      </view>
      <view v-if="detail.photoUrls?.length" class="photos">
        <image
          v-for="(url, idx) in detail.photoUrls"
          :key="idx"
          class="photo"
          :src="resolveMediaUrl(url)"
          mode="aspectFill"
          @click="preview(idx)"
        />
      </view>

      <!-- 审批人：申请审批 -->
      <view v-if="canApproveApply" class="actions">
        <button class="btn" @click="approve(true)">通过申请</button>
        <button class="ghost" @click="approve(false)">退回</button>
      </view>

      <!-- 申请人：补录实际 -->
      <view v-if="canSubmitActual" class="section">补录实际加班</view>
      <view v-if="canSubmitActual">
        <view class="label">实际开始</view>
        <picker mode="date" :value="aStartDate" @change="onAStartDate">
          <view class="picker">日期：{{ aStartDate }}</view>
        </picker>
        <picker mode="time" :value="aStartTime" @change="onAStartTime">
          <view class="picker">时间：{{ aStartTime }}</view>
        </picker>
        <view class="label">实际结束</view>
        <picker mode="date" :value="aEndDate" @change="onAEndDate">
          <view class="picker">日期：{{ aEndDate }}</view>
        </picker>
        <picker mode="time" :value="aEndTime" @change="onAEndTime">
          <view class="picker">时间：{{ aEndTime }}</view>
        </picker>
        <button size="mini" class="ghost" @click="pickPhotos">拍照/选图上传</button>
        <view class="photos">
          <image
            v-for="(url, idx) in photos"
            :key="idx"
            class="photo"
            :src="resolveMediaUrl(url)"
            mode="aspectFill"
          />
        </view>
        <button class="btn" :loading="saving" @click="submitActual">提交核验</button>
      </view>

      <!-- 审批人：核验 -->
      <view v-if="canVerify" class="actions">
        <button class="btn" @click="verify(true)">核验通过</button>
        <button class="ghost" @click="verify(false)">退回补录</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { OvertimeStatus } from '@omp/shared';
import { request, uploadFile } from '../../utils/request';
import { resolveMediaUrl } from '../../utils/media';

const id = ref(0);
const detail = ref<any>(null);
const loading = ref(true);
const saving = ref(false);
const photos = ref<string[]>([]);
const user = uni.getStorageSync('omp_user') || {};

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const aStartDate = ref(today);
const aStartTime = ref(hm);
const aEndDate = ref(today);
const aEndTime = ref(hm);

const isApplicant = computed(() => detail.value?.applicantId === user.id);
const canApproveApply = computed(
  () => detail.value?.status === OvertimeStatus.PENDING && !isApplicant.value,
);
const canSubmitActual = computed(
  () =>
    isApplicant.value &&
    (detail.value?.status === OvertimeStatus.APPROVED ||
      detail.value?.status === OvertimeStatus.VERIFY_REJECTED),
);
const canVerify = computed(
  () =>
    detail.value?.status === OvertimeStatus.PENDING_VERIFY && !isApplicant.value,
);

function fmt(v?: string) {
  return (v || '').replace('T', ' ').slice(0, 19);
}

function onAStartDate(e: any) {
  aStartDate.value = e.detail.value;
}
function onAStartTime(e: any) {
  aStartTime.value = e.detail.value;
}
function onAEndDate(e: any) {
  aEndDate.value = e.detail.value;
}
function onAEndTime(e: any) {
  aEndTime.value = e.detail.value;
}

async function load() {
  loading.value = true;
  try {
    detail.value = await request({ url: `/overtimes/${id.value}` });
  } catch (e: any) {
    detail.value = null;
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function approve(pass: boolean) {
  let reason = '';
  if (!pass) {
    const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
      uni.showModal({
        title: '退回理由',
        editable: true,
        placeholderText: '请填写退回理由',
        success: resolve,
        fail: () => resolve({ confirm: false } as any),
      });
    });
    if (!res.confirm) return;
    reason = (res as any).content || '';
    if (!reason.trim()) {
      uni.showToast({ title: '请填写退回理由', icon: 'none' });
      return;
    }
  }
  try {
    await request({
      url: `/overtimes/${id.value}/approve`,
      method: 'PATCH',
      data: { pass, reason },
    });
    uni.showToast({ title: pass ? '已通过' : '已退回', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  }
}

async function verify(pass: boolean) {
  let reason = '';
  if (!pass) {
    const res = await new Promise<UniApp.ShowModalRes>((resolve) => {
      uni.showModal({
        title: '核验退回理由',
        editable: true,
        placeholderText: '请填写理由',
        success: resolve,
        fail: () => resolve({ confirm: false } as any),
      });
    });
    if (!res.confirm) return;
    reason = (res as any).content || '';
    if (!reason.trim()) {
      uni.showToast({ title: '请填写退回理由', icon: 'none' });
      return;
    }
  }
  try {
    await request({
      url: `/overtimes/${id.value}/verify`,
      method: 'PATCH',
      data: { pass, reason },
    });
    uni.showToast({ title: pass ? '已完成' : '已退回', icon: 'success' });
    await load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  }
}

async function pickPhotos() {
  try {
    const choose = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({ count: 3, success: resolve, fail: reject });
      },
    );
    uni.showLoading({ title: '上传中' });
    for (const path of choose.tempFilePaths || []) {
      const uploaded = await uploadFile(path, user.currentTeamId);
      photos.value.push(uploaded.path || uploaded.url);
    }
    uni.hideLoading();
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '上传失败', icon: 'none' });
  }
}

async function submitActual() {
  if (!photos.value.length) {
    uni.showToast({ title: '请上传打卡照片', icon: 'none' });
    return;
  }
  const actualStartAt = `${aStartDate.value}T${aStartTime.value}:00`;
  const actualEndAt = `${aEndDate.value}T${aEndTime.value}:00`;
  if (new Date(actualEndAt) <= new Date(actualStartAt)) {
    uni.showToast({ title: '结束时间须晚于开始时间', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    await request({
      url: `/overtimes/${id.value}/submit-actual`,
      method: 'PATCH',
      data: {
        actualStartAt,
        actualEndAt,
        photoUrls: photos.value,
      },
    });
    uni.showToast({ title: '已提交核验', icon: 'success' });
    photos.value = [];
    await load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

function preview(idx: number) {
  const urls = (detail.value?.photoUrls || []).map((u: string) =>
    resolveMediaUrl(u),
  );
  uni.previewImage({ urls, current: urls[idx] });
}

onLoad((query) => {
  id.value = Number(query?.id || 0);
  if (id.value) load();
  else loading.value = false;
});
</script>

<style scoped>
.page {
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.title-row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  align-items: center;
}
.title { font-size: 32rpx; font-weight: 700; }
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
.meta { color: #7a8a83; margin-top: 10rpx; font-size: 24rpx; }
.section {
  margin-top: 28rpx;
  margin-bottom: 12rpx;
  font-weight: 700;
  border-bottom: 1px solid #eef2f0;
  padding-bottom: 8rpx;
}
.line { margin-top: 8rpx; font-size: 26rpx; color: #14231d; }
.warn { margin-top: 10rpx; color: #b91c1c; font-size: 24rpx; }
.label { margin: 12rpx 0 8rpx; color: #51665c; font-size: 24rpx; }
.picker {
  background: #f3f6f4;
  border-radius: 14rpx;
  padding: 18rpx;
  margin-bottom: 10rpx;
}
.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}
.photo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #e8eeea;
}
.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}
.btn {
  flex: 1;
  background: #0f6e56;
  color: #fff;
  border-radius: 14rpx;
}
.ghost {
  flex: 1;
  background: #e8f4ef;
  color: #0f6e56;
  border-radius: 14rpx;
  margin-bottom: 12rpx;
}
.empty {
  margin-top: 120rpx;
  text-align: center;
  color: #7a8a83;
}
</style>
