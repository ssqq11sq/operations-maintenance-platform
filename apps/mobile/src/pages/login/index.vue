<template>
  <view class="page">
    <view class="brand">运维管理系统</view>
    <view class="sub">移动端 · 打卡 / 工单 / 工作圈</view>
    <view class="card">
      <view class="tabs">
        <text
          class="tab"
          :class="{ active: mode === 'password' }"
          @click="mode = 'password'"
        >登录</text>
        <text
          class="tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >注册</text>
        <!-- 短信登录暂未接真实通道，先隐藏 -->
      </view>

      <view v-if="mode === 'password'">
        <input v-model="username" class="input" placeholder="用户名" />
        <input
          v-model="password"
          class="input"
          password
          placeholder="密码"
        />
        <button class="btn" :loading="loading" @click="onPasswordLogin">登录</button>
      </view>

      <view v-else-if="mode === 'register'">
        <input v-model="regUsername" class="input" placeholder="用户名（字母数字下划线）" />
        <input v-model="regDisplayName" class="input" placeholder="显示名称" />
        <input
          v-model="regPassword"
          class="input"
          password
          placeholder="密码（至少 6 位）"
        />
        <input
          v-model="regPhone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="手机号（选填）"
        />
        <button class="btn" :loading="loading" @click="onRegister">注册并登录</button>
        <view class="hint muted">注册后无团队，请到「团队」页用邀请码加入</view>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="divider">或</view>
      <button class="wx-btn" :loading="wxLoading" @click="onWechatLogin">
        微信一键登录
      </button>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <view class="divider faint">开发调试</view>
      <button class="ghost faint-btn" :loading="wxLoading" @click="onWechatMockLogin">
        模拟微信登录
      </button>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { request } from '../../utils/request';

const mode = ref<'password' | 'register'>('password');
const username = ref('');
const password = ref('');
const regUsername = ref('');
const regDisplayName = ref('');
const regPassword = ref('');
const regPhone = ref('');
const loading = ref(false);
const wxLoading = ref(false);

async function afterLogin(data: any) {
  uni.setStorageSync('omp_token', data.accessToken);
  uni.setStorageSync('omp_user', data.user);
  uni.showToast({ title: '登录成功', icon: 'success' });
  setTimeout(() => {
    uni.switchTab({ url: '/pages/feed/index' });
  }, 300);
}

async function onPasswordLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const data = await request<any>({
      url: '/auth/login',
      method: 'POST',
      data: { username: username.value, password: password.value },
    });
    await afterLogin(data);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function onRegister() {
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(regUsername.value.trim())) {
    uni.showToast({ title: '用户名需 3–32 位字母数字下划线', icon: 'none' });
    return;
  }
  if (!regDisplayName.value.trim()) {
    uni.showToast({ title: '请填写显示名称', icon: 'none' });
    return;
  }
  if (regPassword.value.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' });
    return;
  }
  if (regPhone.value && !/^1\d{10}$/.test(regPhone.value)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const data = await request<any>({
      url: '/auth/register',
      method: 'POST',
      data: {
        username: regUsername.value.trim(),
        password: regPassword.value,
        displayName: regDisplayName.value.trim(),
        ...(regPhone.value ? { phone: regPhone.value } : {}),
      },
    });
    uni.showToast({ title: '注册成功，请加入团队', icon: 'success' });
    uni.setStorageSync('omp_token', data.accessToken);
    uni.setStorageSync('omp_user', data.user);
    setTimeout(() => {
      uni.switchTab({ url: '/pages/team/index' });
    }, 400);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '注册失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function wxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) resolve(res.code);
        else reject(new Error('未获取到微信 code'));
      },
      fail: (err) => reject(err),
    });
  });
}

async function onWechatLogin() {
  wxLoading.value = true;
  try {
    const code = await wxLoginCode();
    const data = await request<any>({
      url: '/auth/wechat/login',
      method: 'POST',
      data: { code },
    });
    await afterLogin(data);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '微信登录失败', icon: 'none' });
  } finally {
    wxLoading.value = false;
  }
}

/** H5 无 wx.login，用随机 code 走后端 mock openid */
async function onWechatMockLogin() {
  wxLoading.value = true;
  try {
    const code = `h5_mock_${Date.now()}`;
    const data = await request<any>({
      url: '/auth/wechat/login',
      method: 'POST',
      data: { code },
    });
    await afterLogin(data);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '模拟登录失败', icon: 'none' });
  } finally {
    wxLoading.value = false;
  }
}

</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 120rpx 48rpx calc(48rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(600rpx 360rpx at 90% 8%, rgba(201, 235, 224, 0.35), transparent 60%),
    linear-gradient(160deg, #0f6e56 0%, #184a40 50%, #0c2430 100%);
}
.brand {
  color: #fff;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.sub {
  color: rgba(255, 255, 255, 0.78);
  margin-top: 12rpx;
  margin-bottom: 64rpx;
  font-size: 26rpx;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.22);
}
.tabs {
  display: flex;
  gap: 32rpx;
  margin-bottom: 28rpx;
}
.tab {
  color: #7a8a83;
  font-size: 28rpx;
  padding-bottom: 10rpx;
}
.tab.active {
  color: #0f6e56;
  font-weight: 700;
  border-bottom: 4rpx solid #0f6e56;
}
.input {
  background: #f3f6f4;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid transparent;
}
.btn {
  background: #0f6e56;
  color: #fff;
  border-radius: 16rpx;
  margin-top: 8rpx;
  font-weight: 600;
}
.btn:active {
  opacity: 0.88;
}
.wx-btn {
  background: #07c160;
  color: #fff;
  border-radius: 16rpx;
}
.ghost {
  background: #eef2f0;
  color: #51665c;
  border-radius: 16rpx;
}
.faint-btn {
  opacity: 0.72;
  font-size: 26rpx;
}
.divider {
  text-align: center;
  color: #9aa89f;
  margin: 28rpx 0 16rpx;
  font-size: 24rpx;
}
.divider.faint {
  color: #c0cac4;
  margin-top: 36rpx;
}
.hint {
  margin-top: 24rpx;
  color: #0f6e56;
  font-size: 24rpx;
  text-align: center;
}
.hint.muted {
  color: #7a8a83;
  text-decoration: none;
}
</style>
