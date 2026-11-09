<template>
  <view class="page">
    <view class="card">
      <view class="title">当前用户</view>
      <view>{{ user?.displayName }}（{{ user?.username }}）</view>
    </view>

    <view class="card">
      <view class="title">我的团队</view>
      <view v-if="loading" class="empty">加载中…</view>
      <view v-else-if="!teams.length" class="empty">暂无团队，请使用邀请码加入</view>
      <view
        v-for="t in teams"
        :key="t.id"
        class="team"
        :class="{ active: t.id === user?.currentTeamId }"
        @click="switchTeam(t.id)"
      >
        <view>{{ t.name }}</view>
        <view class="code">邀请码 {{ t.inviteCode }}</view>
      </view>
    </view>

    <view class="card">
      <view class="title">加入团队</view>
      <input v-model="inviteCode" class="input" placeholder="输入邀请码" />
      <button class="btn" @click="join">加入</button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="wx" :loading="binding" @click="bindWechat">
        {{ user?.wxOpenId ? '已绑定微信（可重新绑定）' : '绑定微信' }}
      </button>
      <!-- #endif -->
      <button class="ghost" @click="logout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const user = ref<any>(uni.getStorageSync('omp_user'));
const teams = ref<any[]>([]);
const inviteCode = ref('');
const loading = ref(false);
const binding = ref(false);

async function load() {
  loading.value = true;
  try {
    user.value = await request({ url: '/auth/profile' });
    uni.setStorageSync('omp_user', user.value);
    teams.value = await request({ url: '/teams/mine' });
  } finally {
    loading.value = false;
  }
}

async function switchTeam(id: number) {
  await request({ url: `/teams/${id}/switch`, method: 'POST' });
  await load();
  uni.showToast({ title: '已切换团队', icon: 'success' });
}

async function join() {
  try {
    await request({
      url: '/teams/join',
      method: 'POST',
      data: { inviteCode: inviteCode.value },
    });
    await load();
    uni.showToast({ title: '加入成功', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加入失败', icon: 'none' });
  }
}

async function bindWechat() {
  binding.value = true;
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => (res.code ? resolve(res.code) : reject(new Error('无 code'))),
        fail: reject,
      });
    });
    await request({
      url: '/auth/wechat/bind',
      method: 'POST',
      data: { code },
    });
    await load();
    uni.showToast({ title: '微信已绑定', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '绑定失败', icon: 'none' });
  } finally {
    binding.value = false;
  }
}

function logout() {
  uni.removeStorageSync('omp_token');
  uni.removeStorageSync('omp_user');
  uni.reLaunch({ url: '/pages/login/index' });
}

onShow(() => {
  load().catch(() => undefined);
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
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(20, 35, 29, 0.04);
}
.title {
  font-weight: 700;
  margin-bottom: 16rpx;
  font-size: 30rpx;
}
.team {
  padding: 18rpx 16rpx;
  border-radius: 14rpx;
  margin-bottom: 8rpx;
  background: #f7faf8;
}
.team.active {
  color: #0f6e56;
  font-weight: 600;
  background: #e8f4ef;
  border: 1px solid #0f6e56;
}
.code { color: #7a8a83; font-size: 24rpx; margin-top: 4rpx; }
.empty {
  color: #7a8a83;
  font-size: 26rpx;
  padding: 8rpx 0 12rpx;
}
.input {
  background: #f3f6f4;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.btn {
  background: #0f6e56;
  color: #fff;
  border-radius: 14rpx;
  margin-bottom: 16rpx;
  font-weight: 600;
}
.wx {
  background: #07c160;
  color: #fff;
  border-radius: 14rpx;
  margin-bottom: 16rpx;
}
.ghost {
  background: #eef2f0;
  color: #51665c;
  border-radius: 14rpx;
}
</style>
