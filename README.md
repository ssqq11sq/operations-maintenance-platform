# 运维管理系统 MVP

基于 `OandM_System_Design.md` 的可演示 MVP：统一登录权限、团队隔离、打卡拍照上传、工单模板与填写闭环。

## 技术栈

| 端 | 技术 |
| :--- | :--- |
| API | NestJS + TypeORM + JWT |
| Web 管理后台 | React 18 + Vite + Ant Design |
| 移动端 | uniapp（Vue3 + TypeScript），优先 H5 / 微信小程序 |
| 数据 | 默认 sql.js 本地库（免 Docker）；可切换 MySQL + Redis + MinIO |

## 目录结构

```
apps/api      # 后端
apps/web      # Web 管理后台
apps/mobile   # uniapp 移动端
packages/shared
docker-compose.yml
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
pnpm approve-builds esbuild "@parcel/watcher" core-js
pnpm --filter @omp/shared build
```

> 本仓库使用 pnpm 11，需在 `pnpm-workspace.yaml` 的 `allowBuilds` 中允许 esbuild 等构建脚本。

### 2. 启动 API

```bash
pnpm dev:api
```

默认使用 `apps/api/.env` 中的 sql.js 本地数据库，首次启动自动写入种子数据。  
API：http://localhost:3000/api

### 3. 启动 Web 后台

```bash
pnpm dev:web
```

访问 http://localhost:5173

### 4. 启动移动端（H5）

```bash
pnpm dev:mobile
```

访问 http://localhost:5174

## 演示账号

| 账号 | 密码 | 角色 |
| :--- | :--- | :--- |
| `superadmin` | `admin123` | 主管理员 |
| `admin` | `admin123` | 团队管理员 |
| `staff` | `staff123` | 运维人员 |

演示团队邀请码：`DEMO8888`

## 使用 Docker 基础设施（可选）

本机已安装 Docker 时：

```bash
docker compose up -d
```

然后将 `apps/api/.env` 改为：

```env
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=omp
DB_PASSWORD=omp123
DB_NAME=omp
DB_SYNC=true

STORAGE_DRIVER=minio
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=omp-files
```

## 高德地图 Key 配置

在[高德开放平台](https://console.amap.com/dev/key/app)按用途分别创建 Key，填到本地 `.env`（不要提交到 Git）：

| 用途 | 控制台类型 | 配置位置 |
| :--- | :--- | :--- |
| Web 管理后台地图 | Web端(JS API) | `apps/web/.env` → `VITE_AMAP_KEY` |
| Web 安全密钥（控制台开启后必填） | 同应用「安全密钥」 | `apps/web/.env` → `VITE_AMAP_SECURITY_CODE` |
| 微信小程序 | 微信小程序 | `apps/mobile/.env` → `VITE_AMAP_MP_KEY` |
| 逆地理编码（打卡转文字地址） | **Web服务** | `apps/api/.env` → `AMAP_KEY` |

填完后重启对应进程。可用登录态请求 `GET /api/geo/config` 检查后端 Key 是否已配置；`/api/geo/regeo` 失败时会返回 `hint`（例如 Key 平台类型不匹配）。

## 登录方式

| 方式 | 说明 |
| :--- | :--- |
| 账号密码 | Web / 移动端均支持 |
| 手机短信 | `POST /auth/sms/send` + `/auth/sms/login`；默认 `SMS_MOCK=true`，验证码在接口返回 `devCode` 并写服务端日志。种子手机：`13800000002`(admin)、`13800000003`(staff) |
| 微信小程序 | `POST /auth/wechat/login`；配置 `WECHAT_MP_APPID` / `WECHAT_MP_SECRET` 后走正式 code2session；未配置则为 mock。团队页可「绑定微信」 |

相关环境变量见 `apps/api/.env.example`。`AUTH_AUTO_REGISTER=true` 时，未绑定手机/微信的首次登录会自动创建 STAFF 账号。

## 已实现能力（含 Phase 2）

- 团队编辑 / 重置邀请码；成员改角色 / 移出
- 系统用户管理（超管：创建/停用/角色/重置密码）
- API 写操作角色权限（RolesGuard）
- 工单模板可视化字段编辑与停用；Web / 移动端按模板填单（含图片/附件）
- 工单详情（双端）
- 打卡水印要素勾选（偏好本地保存）
- 照片按「人员 / 日期」目录浏览与打包下载
- 巡检路线复盘（高德地图）、统计分析与 Excel 导出
- 监控大屏 + WebSocket 实时刷新（断线时轮询兜底）
- 短信登录（mock 可联调）/ 微信小程序登录与绑定
- 工单指派/改派；操作审计日志
- 巡检轨迹纠偏与时间轴回放
- 移动端离线打卡队列（弱网自动缓存与同步）
- WebSocket 鉴权加入团队；登录接口简易限流

## 明确未实现（后续迭代）

真实短信厂商对接完善、数据库 migration 替代 DB_SYNC、AI / IoT。
