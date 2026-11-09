<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!detail" class="empty">工单不存在</view>
    <view v-else class="card">
      <view class="title">{{ detail.title }}</view>
      <view class="meta-row">
        <text class="badge" :class="'st-' + detail.status">{{ labelOf(detail.status) }}</text>
        <text class="meta">{{ detail.templateName }} · {{ detail.creatorName }}</text>
      </view>
      <view class="meta time">
        {{ formatTime(detail.createdAt) }}
      </view>

      <view class="section">表单内容</view>
      <view
        v-for="field in fields"
        :key="field.key"
        class="field"
      >
        <view class="label">{{ field.label }}</view>
        <view
          v-if="field.type === 'image' && asList(formValue(field.key)).length"
          class="photo-list"
        >
          <image
            v-for="(url, idx) in asList(formValue(field.key))"
            :key="url + '_' + idx"
            class="photo"
            :src="resolveMediaUrl(url)"
            mode="aspectFill"
            @click="previewList(asList(formValue(field.key)), idx)"
          />
        </view>
        <view
          v-else-if="field.type === 'file' && asList(formValue(field.key)).length"
          class="file-list"
        >
          <text
            v-for="(url, idx) in asList(formValue(field.key))"
            :key="url + '_' + idx"
            class="link"
            @click="openFile(url)"
          >
            附件{{ idx + 1 }}：{{ fileName(url) }}
          </text>
        </view>
        <text v-else class="value">{{ displayValue(field) }}</text>
      </view>
      <view v-if="!fields.length" class="value">
        {{ JSON.stringify(detail.formData || {}) }}
      </view>

      <view class="section">流转</view>
      <view class="actions">
        <text
          v-for="next in nextStatuses(detail.status)"
          :key="next"
          class="chip"
          @click="updateStatus(next)"
        >
          设为{{ labelOf(next) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import {
  WORK_ORDER_STATUS_LABEL,
  WorkOrderStatus,
  type FormFieldDef,
} from '@omp/shared';
import { request } from '../../utils/request';
import { resolveMediaUrl } from '../../utils/media';

const id = ref(0);
const detail = ref<any>(null);
const loading = ref(true);

const fields = computed<FormFieldDef[]>(
  () => detail.value?.templateFields || [],
);

function labelOf(s: WorkOrderStatus) {
  return WORK_ORDER_STATUS_LABEL[s] || s;
}

function formatTime(v: string) {
  return (v || '').replace('T', ' ').slice(0, 19);
}

function formValue(key: string) {
  return detail.value?.formData?.[key];
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v)];
}

function fileName(url: string) {
  return decodeURIComponent((url.split('/').pop() || url).split('?')[0]);
}

function displayValue(field: FormFieldDef) {
  const v = formValue(field.key);
  if (v == null || v === '') return '-';
  const opts = field.options || [];
  const toText = (val: unknown) => {
    const hit = opts.find(
      (o) => String(o.value) === String(val) || String(o.label) === String(val),
    );
    return hit?.label || String(val);
  };
  if (Array.isArray(v)) return v.map(toText).join('、') || '-';
  if (field.type === 'select' || field.type === 'multiselect') return toText(v);
  return String(v);
}

function nextStatuses(current: WorkOrderStatus): WorkOrderStatus[] {
  return Object.values(WorkOrderStatus).filter((s) => s !== current);
}

async function load() {
  loading.value = true;
  try {
    detail.value = await request({ url: `/work-orders/${id.value}` });
  } catch (e: any) {
    detail.value = null;
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function updateStatus(next: WorkOrderStatus) {
  await request({
    url: `/work-orders/${id.value}/status`,
    method: 'PATCH',
    data: { status: next },
  });
  uni.showToast({ title: '已更新', icon: 'success' });
  await load();
}

function previewList(urls: string[], index = 0) {
  const fulls = urls.map((u) => resolveMediaUrl(u));
  uni.previewImage({ urls: fulls, current: fulls[index] || fulls[0] });
}

function fileExt(url: string) {
  const clean = url.split('?')[0] || '';
  const name = clean.split('/').pop() || '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function openFile(url: string) {
  const full = resolveMediaUrl(url);
  const ext = fileExt(url || full);
  const office = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'];

  // #ifdef H5
  if (typeof window !== 'undefined') {
    if (ext === 'pdf' || !office.includes(ext)) {
      window.open(full, '_blank');
      return;
    }
    // 浏览器无法可靠预览 Office，改为下载
    const a = document.createElement('a');
    a.href = full;
    a.download = decodeURIComponent((url.split('/').pop() || `file.${ext}`).split('?')[0]);
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    uni.showToast({ title: '已开始下载，可用 WPS/Office 打开', icon: 'none' });
    return;
  }
  // #endif

  uni.showLoading({ title: '打开中' });
  uni.downloadFile({
    url: full,
    success: (res) => {
      if (res.statusCode !== 200) {
        uni.hideLoading();
        uni.showToast({ title: '下载失败', icon: 'none' });
        return;
      }
      uni.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        fileType: office.includes(ext) ? (ext as any) : undefined,
        success: () => uni.hideLoading(),
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: '无法预览该文件', icon: 'none' });
        },
      });
    },
    fail: () => {
      uni.hideLoading();
      uni.showToast({ title: '下载失败', icon: 'none' });
    },
  });
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
.title { font-size: 34rpx; font-weight: 700; }
.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}
.badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.st-PENDING { color: #d97706; background: #fff7ed; }
.st-IN_PROGRESS { color: #2563eb; background: #eff6ff; }
.st-COMPLETED { color: #0f6e56; background: #e8f4ef; }
.st-CLOSED { color: #6b7280; background: #f3f4f6; }
.meta { color: #7a8a83; font-size: 24rpx; }
.time { margin: 8rpx 0 4rpx; color: #7a8a83; font-size: 24rpx; }
.section {
  margin-top: 32rpx;
  margin-bottom: 16rpx;
  padding-bottom: 10rpx;
  font-weight: 700;
  color: #14231d;
  border-bottom: 1px solid #eef2f0;
}
.field {
  margin-bottom: 22rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid #f5f7f6;
}
.field:last-of-type { border-bottom: none; }
.label { color: #51665c; font-size: 24rpx; margin-bottom: 8rpx; }
.value { color: #14231d; font-size: 28rpx; word-break: break-all; }
.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.photo {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  background: #e8eeea;
}
.file-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.link { color: #0f6e56; word-break: break-all; }
.actions { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip {
  padding: 12rpx 22rpx;
  background: #e8f4ef;
  color: #0f6e56;
  border-radius: 999rpx;
  font-size: 24rpx;
}
.chip:active { opacity: 0.85; }
.empty {
  margin-top: 120rpx;
  text-align: center;
  color: #7a8a83;
}
</style>
