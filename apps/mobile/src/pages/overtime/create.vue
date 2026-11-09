<template>
  <view class="page">
    <view class="card">
      <view class="label">开始时间</view>
      <picker mode="date" :value="startDate" @change="onStartDate">
        <view class="picker">日期：{{ startDate || '请选择' }}</view>
      </picker>
      <picker mode="time" :value="startTime" @change="onStartTime">
        <view class="picker">时间：{{ startTime || '请选择' }}</view>
      </picker>

      <view class="label">结束时间</view>
      <picker mode="date" :value="endDate" @change="onEndDate">
        <view class="picker">日期：{{ endDate || '请选择' }}</view>
      </picker>
      <picker mode="time" :value="endTime" @change="onEndTime">
        <view class="picker">时间：{{ endTime || '请选择' }}</view>
      </picker>

      <view class="label">加班事由</view>
      <textarea
        v-model="reason"
        class="textarea"
        placeholder="请填写加班事由"
      />
      <button class="btn" :loading="loading" @click="submit">提交申请</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { request } from '../../utils/request';

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

const startDate = ref(today);
const startTime = ref(hm);
const endDate = ref(today);
const endTime = ref(hm);
const reason = ref('');
const loading = ref(false);

function onStartDate(e: any) {
  startDate.value = e.detail.value;
}
function onStartTime(e: any) {
  startTime.value = e.detail.value;
}
function onEndDate(e: any) {
  endDate.value = e.detail.value;
}
function onEndTime(e: any) {
  endTime.value = e.detail.value;
}

async function submit() {
  if (!startDate.value || !startTime.value || !endDate.value || !endTime.value) {
    uni.showToast({ title: '请选择完整时间', icon: 'none' });
    return;
  }
  if (!reason.value.trim()) {
    uni.showToast({ title: '请填写加班事由', icon: 'none' });
    return;
  }
  const planStartAt = `${startDate.value}T${startTime.value}:00`;
  const planEndAt = `${endDate.value}T${endTime.value}:00`;
  if (new Date(planEndAt) <= new Date(planStartAt)) {
    uni.showToast({ title: '结束时间须晚于开始时间', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await request({
      url: '/overtimes',
      method: 'POST',
      data: { planStartAt, planEndAt, reason: reason.value.trim() },
    });
    uni.showToast({ title: '已提交', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 400);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
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
.label {
  margin: 12rpx 0 10rpx;
  color: #51665c;
  font-size: 26rpx;
  font-weight: 500;
}
.picker, .textarea {
  background: #f3f6f4;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}
.textarea {
  width: 100%;
  min-height: 180rpx;
}
.btn {
  margin-top: 20rpx;
  background: #0f6e56;
  color: #fff;
  border-radius: 16rpx;
  font-weight: 600;
}
</style>
