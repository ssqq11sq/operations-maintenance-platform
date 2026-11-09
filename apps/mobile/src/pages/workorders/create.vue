<template>
  <view class="page">
    <view class="card">
      <picker :range="templates" range-key="name" @change="onPickTemplate">
        <view class="picker">模板：{{ currentTemplate?.name || '请选择' }}</view>
      </picker>
      <input v-model="title" class="input" placeholder="工单标题" />
      <view class="label">指派给</view>
      <picker :range="members" range-key="displayName" @change="onPickAssignee">
        <view class="picker">{{ assigneeLabel }}</view>
      </picker>
      <view v-for="field in fields" :key="field.key" class="field">
        <view class="label">{{ field.label }}</view>
        <input
          v-if="field.type === 'text' || field.type === 'number'"
          v-model="formData[field.key]"
          class="input"
          :placeholder="field.placeholder || field.label"
        />
        <textarea
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.key]"
          class="textarea"
          :placeholder="field.placeholder || field.label"
        />
        <picker
          v-else-if="field.type === 'select'"
          :range="field.options || []"
          range-key="label"
          @change="onSelect(field.key, field.options, $event)"
        >
          <view class="picker">{{ selectLabel(field) }}</view>
        </picker>
        <view v-else-if="field.type === 'multiselect'" class="multi">
          <view
            v-for="opt in field.options || []"
            :key="String(opt.value || opt.label)"
            class="multi-item"
            :class="{ active: isMultiChecked(field.key, opt.value || opt.label) }"
            @click="toggleMulti(field.key, opt.value || opt.label)"
          >
            <text class="multi-check">{{
              isMultiChecked(field.key, opt.value || opt.label) ? '✓' : ''
            }}</text>
            <text class="multi-label">{{ opt.label || opt.value }}</text>
          </view>
          <view v-if="!(field.options && field.options.length)" class="multi-empty">
            暂无选项，请在后台模板中配置
          </view>
        </view>
        <slider
          v-else-if="field.type === 'rating'"
          :min="1"
          :max="field.max || 5"
          :value="Number(formData[field.key] || 3)"
          show-value
          @change="onRating(field.key, $event)"
        />
        <view v-else-if="field.type === 'image'" class="upload-block">
          <button size="mini" class="ghost" @click="pickImage(field.key)">添加图片</button>
          <view class="thumb-list">
            <view
              v-for="(url, idx) in asList(formData[field.key])"
              :key="url + '_' + idx"
              class="thumb-wrap"
            >
              <image class="thumb" :src="resolveMediaUrl(url)" mode="aspectFill" />
              <text class="thumb-del" @click="removeUpload(field.key, idx)">×</text>
            </view>
          </view>
        </view>
        <view v-else-if="field.type === 'file'" class="upload-block">
          <button size="mini" class="ghost" @click="pickFile(field.key)">添加附件</button>
          <view
            v-for="(url, idx) in asList(formData[field.key])"
            :key="url + '_' + idx"
            class="file-row"
          >
            <text class="file-path">{{ fileName(url) }}</text>
            <text class="file-del" @click="removeUpload(field.key, idx)">删除</text>
          </view>
        </view>
        <input
          v-else
          v-model="formData[field.key]"
          class="input"
          :placeholder="field.label"
        />
      </view>
      <button class="btn" :loading="loading" @click="submit">提交工单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { FormFieldDef } from '@omp/shared';
import { request, uploadFile } from '../../utils/request';
import { resolveMediaUrl } from '../../utils/media';

const templates = ref<any[]>([]);
const members = ref<any[]>([]);
const templateId = ref<number | null>(null);
const assigneeId = ref<number | null>(null);
const title = ref('');
const formData = reactive<Record<string, any>>({});
const loading = ref(false);

const currentTemplate = computed(() =>
  templates.value.find((t) => t.id === templateId.value),
);
const fields = computed<FormFieldDef[]>(
  () => currentTemplate.value?.fields || [],
);
const assigneeLabel = computed(() => {
  const m = members.value.find((x) => x.userId === assigneeId.value);
  return m?.displayName || '默认自己';
});

function clearFormData() {
  Object.keys(formData).forEach((k) => delete formData[k]);
}

async function loadTemplates() {
  templates.value = await request({ url: '/templates' });
  if (templates.value.length) {
    templateId.value = templates.value[0].id;
    title.value = `${templates.value[0].name}-${new Date().toLocaleDateString()}`;
    clearFormData();
  }
  const profile = await request<any>({ url: '/auth/profile' });
  if (profile?.currentTeamId) {
    members.value = await request({
      url: `/teams/${profile.currentTeamId}/members`,
    });
    assigneeId.value = profile.id;
  }
}

function onPickTemplate(e: any) {
  const idx = Number(e.detail.value);
  templateId.value = templates.value[idx]?.id;
  title.value = `${templates.value[idx]?.name}-${new Date().toLocaleDateString()}`;
  clearFormData();
}

function onPickAssignee(e: any) {
  const idx = Number(e.detail.value);
  assigneeId.value = members.value[idx]?.userId ?? null;
}

function onSelect(key: string, options: any[] | undefined, e: any) {
  const opt = options?.[Number(e.detail.value)];
  formData[key] = opt?.value || opt?.label || '';
}

function selectLabel(field: FormFieldDef) {
  const val = formData[field.key];
  if (val == null || val === '') return '请选择';
  const opt = (field.options || []).find((o) => String(o.value) === String(val));
  return opt?.label || String(val);
}

function isMultiChecked(key: string, value: string) {
  const arr = Array.isArray(formData[key]) ? formData[key] : [];
  return arr.map(String).includes(String(value));
}

function toggleMulti(key: string, value: string) {
  const cur = Array.isArray(formData[key]) ? [...formData[key]] : [];
  const i = cur.findIndex((v) => String(v) === String(value));
  if (i >= 0) cur.splice(i, 1);
  else cur.push(value);
  formData[key] = cur;
}

function onRating(key: string, e: any) {
  formData[key] = e.detail.value;
}

function isEmptyValue(v: unknown) {
  if (v == null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v)];
}

function fileName(url: string) {
  return decodeURIComponent((url.split('/').pop() || url).split('?')[0]);
}

function appendUploads(key: string, paths: string[]) {
  const next = [...asList(formData[key]), ...paths.filter(Boolean)];
  formData[key] = next;
}

function removeUpload(key: string, index: number) {
  const next = asList(formData[key]).filter((_, i) => i !== index);
  formData[key] = next;
}

async function pickImage(key: string) {
  try {
    const remain = Math.max(1, 9 - asList(formData[key]).length);
    const choose = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: remain,
          success: resolve,
          fail: reject,
        });
      },
    );
    const paths = choose.tempFilePaths || [];
    if (!paths.length) return;
    const user = uni.getStorageSync('omp_user') || {};
    uni.showLoading({ title: '上传中' });
    const uploadedPaths: string[] = [];
    for (const path of paths) {
      const uploaded = await uploadFile(path, user.currentTeamId);
      uploadedPaths.push(uploaded.path || uploaded.url);
    }
    appendUploads(key, uploadedPaths);
    uni.hideLoading();
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '上传失败', icon: 'none' });
  }
}

async function pickFile(key: string) {
  try {
    // #ifdef H5
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      try {
        const user = uni.getStorageSync('omp_user') || {};
        uni.showLoading({ title: '上传中' });
        const uploadedPaths: string[] = [];
        for (const file of files) {
          const uploaded = await uploadFile(file, user.currentTeamId, file.name);
          uploadedPaths.push(uploaded.path || uploaded.url);
        }
        appendUploads(key, uploadedPaths);
        uni.hideLoading();
      } catch (e: any) {
        uni.hideLoading();
        uni.showToast({ title: e?.message || '上传失败', icon: 'none' });
      }
    };
    input.click();
    return;
    // #endif

    const choose = await new Promise<any>((resolve, reject) => {
      uni.chooseMessageFile({
        count: 9,
        type: 'file',
        success: resolve,
        fail: reject,
      });
    });
    const temps = choose.tempFiles || [];
    if (!temps.length) return;
    const user = uni.getStorageSync('omp_user') || {};
    uni.showLoading({ title: '上传中' });
    const uploadedPaths: string[] = [];
    for (const temp of temps) {
      if (!temp?.path) continue;
      const uploaded = await uploadFile(temp.path, user.currentTeamId, temp?.name);
      uploadedPaths.push(uploaded.path || uploaded.url);
    }
    appendUploads(key, uploadedPaths);
    uni.hideLoading();
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '选择失败', icon: 'none' });
  }
}

async function submit() {
  if (!templateId.value || !title.value) {
    uni.showToast({ title: '请完善工单信息', icon: 'none' });
    return;
  }
  for (const f of fields.value) {
    if (f.required && isEmptyValue(formData[f.key])) {
      uni.showToast({ title: `请填写${f.label}`, icon: 'none' });
      return;
    }
  }
  loading.value = true;
  try {
    await request({
      url: '/work-orders',
      method: 'POST',
      data: {
        templateId: templateId.value,
        title: title.value,
        assigneeId: assigneeId.value || undefined,
        formData: { ...formData },
      },
    });
    uni.showToast({ title: '提交成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 400);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onLoad(() => {
  loadTemplates().catch((e) =>
    uni.showToast({ title: e?.message || '加载模板失败', icon: 'none' }),
  );
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
.input, .picker, .textarea {
  background: #f3f6f4;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.textarea { width: 100%; min-height: 160rpx; }
.field {
  margin-bottom: 18rpx;
  padding-bottom: 12rpx;
  border-bottom: 1px solid #f5f7f6;
}
.field:last-of-type { border-bottom: none; }
.label {
  margin-bottom: 10rpx;
  color: #51665c;
  font-size: 26rpx;
  font-weight: 500;
}
.multi {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.multi-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: #f3f6f4;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #51665c;
  border: 1px solid transparent;
}
.multi-item.active {
  background: #e8f4ef;
  color: #0f6e56;
  border-color: #0f6e56;
}
.multi-check {
  width: 28rpx;
  text-align: center;
  font-weight: 700;
}
.multi-label {
  font-size: 26rpx;
}
.multi-empty {
  color: #b45309;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}
.upload-block { margin-bottom: 16rpx; }
.ghost {
  background: #e8f4ef;
  color: #0f6e56;
  margin-bottom: 12rpx;
}
.thumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.thumb-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
}
.thumb-del {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 32rpx;
  text-align: center;
  border-radius: 50%;
  background: #b91c1c;
  color: #fff;
  font-size: 28rpx;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.file-path {
  flex: 1;
  font-size: 22rpx;
  color: #7a8a83;
  word-break: break-all;
}
.file-del {
  color: #b91c1c;
  font-size: 22rpx;
  flex-shrink: 0;
}
.btn {
  margin-top: 20rpx;
  background: #0f6e56;
  color: #fff;
  border-radius: 16rpx;
  font-weight: 600;
}
.btn:active { opacity: 0.88; }
</style>
