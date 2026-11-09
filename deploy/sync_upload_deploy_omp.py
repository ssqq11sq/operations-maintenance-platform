"""Upload OMP monorepo to Aliyun, build, and start PM2 on port 3001 (coexist with qjsl)."""
from __future__ import annotations

import os
import sys
import tarfile
import tempfile
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "116.62.238.95")
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
USER = os.environ.get("DEPLOY_USER", "root")
APP_DIR = "/home/ubuntu/omp_platform"
REMOTE_TAR = "/tmp/omp-deploy.tar.gz"
API_PORT = 3001

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".cursor",
    "uploads",
    "data",
    "agent-transcripts",
}
EXCLUDE_NAMES = {".env", ".DS_Store"}

WEB_PORT = 8080


def _read_env_file(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.is_file():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        result[key.strip()] = val.strip().strip('"').strip("'")
    return result


def make_build_cmd(amap_key: str, amap_security: str = "") -> str:
    return f"""
set -e
APP="{APP_DIR}"
TAR="{REMOTE_TAR}"
mkdir -p "$APP"
# 保留线上 .env
if [ -f "$APP/apps/api/.env" ]; then cp "$APP/apps/api/.env" /tmp/omp-api-env-backup; fi
if [ -f "$APP/apps/web/.env" ]; then cp "$APP/apps/web/.env" /tmp/omp-web-env-backup; fi
tar -xzf "$TAR" -C "$APP"
if [ -f /tmp/omp-api-env-backup ]; then mv /tmp/omp-api-env-backup "$APP/apps/api/.env"; fi
if [ -f /tmp/omp-web-env-backup ]; then mv /tmp/omp-web-env-backup "$APP/apps/web/.env"; fi

# 首次生成 API 环境
if [ ! -f "$APP/apps/api/.env" ]; then
  cat > "$APP/apps/api/.env" <<EOF
NODE_ENV=production
PORT={API_PORT}
JWT_SECRET=omp-prod-change-me-please
JWT_EXPIRES_IN=7d
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=omp
DB_PASSWORD=omp_Passw0rd!
DB_NAME=omp
DB_SYNC=true
REDIS_ENABLED=false
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=./uploads
PUBLIC_BASE_URL=https://omp.qjwater-gs.com
CORS_ORIGINS=https://omp.qjwater-gs.com,http://omp.qjwater-gs.com,http://{HOST}:{WEB_PORT}
SMS_MOCK=true
AUTH_AUTO_REGISTER=true
SEED_SUPER_USERNAME=superadmin
SEED_SUPER_PASSWORD=Omp@2026Super
SEED_SUPER_DISPLAY_NAME=超级管理员
OMP_RESET_DATA=false
EOF
fi

# 已有 .env 时补上域名 CORS / 公网地址（不覆盖其它项）
if [ -f "$APP/apps/api/.env" ]; then
  grep -q 'omp.qjwater-gs.com' "$APP/apps/api/.env" || \
    sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://omp.qjwater-gs.com,http://omp.qjwater-gs.com,http://{HOST}:{WEB_PORT}|' "$APP/apps/api/.env"
  grep -q 'PUBLIC_BASE_URL=https://omp.qjwater-gs.com' "$APP/apps/api/.env" || \
    sed -i 's|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://omp.qjwater-gs.com|' "$APP/apps/api/.env"
  grep -q 'SEED_SUPER_USERNAME=' "$APP/apps/api/.env" || echo 'SEED_SUPER_USERNAME=superadmin' >> "$APP/apps/api/.env"
  grep -q 'SEED_SUPER_PASSWORD=' "$APP/apps/api/.env" || echo 'SEED_SUPER_PASSWORD=Omp@2026Super' >> "$APP/apps/api/.env"
  grep -q 'SEED_SUPER_DISPLAY_NAME=' "$APP/apps/api/.env" || echo 'SEED_SUPER_DISPLAY_NAME=超级管理员' >> "$APP/apps/api/.env"
fi

# 一次性清空演示账号/团队（仅首次）
RESET_MARKER="$APP/.data_reset_superadmin_only"
if [ ! -f "$RESET_MARKER" ]; then
  echo '=== one-time data reset (keep superadmin only) ==='
  if grep -q '^OMP_RESET_DATA=' "$APP/apps/api/.env"; then
    sed -i 's|^OMP_RESET_DATA=.*|OMP_RESET_DATA=true|' "$APP/apps/api/.env"
  else
    echo 'OMP_RESET_DATA=true' >> "$APP/apps/api/.env"
  fi
  touch "$RESET_MARKER.pending"
fi

# Web 构建：同源 /api + 高德 JS Key（构建期注入）
cat > "$APP/apps/web/.env.production" <<EOF
VITE_API_BASE_URL=/api
VITE_WS_URL=
VITE_AMAP_KEY={amap_key}
VITE_AMAP_SECURITY_CODE={amap_security}
EOF

# MySQL 库与用户（已存在则忽略）
mysql -e "CREATE DATABASE IF NOT EXISTS omp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || true
mysql -e "CREATE USER IF NOT EXISTS 'omp'@'localhost' IDENTIFIED BY 'omp_Passw0rd!';" || true
mysql -e "GRANT ALL PRIVILEGES ON omp.* TO 'omp'@'localhost'; FLUSH PRIVILEGES;" || true

cd "$APP"
export CI=true
export NODE_ENV=development
pnpm config set confirmModulesPurge false 2>/dev/null || true
echo '=== pnpm install ==='
pnpm install --no-frozen-lockfile
echo '=== build shared/api/web/mobile-h5 ==='
pnpm --filter @omp/shared build
pnpm --filter @omp/api build
pnpm --filter @omp/web build
pnpm --filter @omp/mobile build:h5
test -f apps/api/dist/main.js
test -f apps/web/dist/index.html
test -f apps/mobile/dist/build/h5/index.html
mkdir -p apps/api/uploads apps/api/data
# 发布移动端 H5 到 /m/
mkdir -p "$APP/public/m"
rm -rf "$APP/public/m"
mkdir -p "$APP/public/m"
cp -a apps/mobile/dist/build/h5/. "$APP/public/m/"

echo '=== nginx omp ==='
# include 占位：有证书则保留现有 ssl/redirect，否则用 HTTP 站点片段
if [ ! -f /etc/nginx/sites-available/omp-ssl.inc ] || [ ! -s /etc/nginx/sites-available/omp-ssl.inc ] || grep -q 'ssl pending' /etc/nginx/sites-available/omp-ssl.inc 2>/dev/null; then
  echo '# ssl pending' > /etc/nginx/sites-available/omp-ssl.inc
fi
if [ ! -f /etc/nginx/sites-available/omp-http-root.inc ]; then
  cp "$APP/deploy/nginx-omp-http-root.inc" /etc/nginx/sites-available/omp-http-root.inc
fi
# 若已有正式证书，同步最新 ssl 片段
if [ -f /etc/letsencrypt/live/omp.qjwater-gs.com/fullchain.pem ]; then
  cp "$APP/deploy/nginx-omp-ssl.inc" /etc/nginx/sites-available/omp-ssl.inc
  cp "$APP/deploy/nginx-omp-http-redirect.inc" /etc/nginx/sites-available/omp-http-root.inc
fi
cp "$APP/deploy/nginx-omp-m.inc" /etc/nginx/sites-available/omp-m.inc
cp "$APP/deploy/nginx-omp.conf" /etc/nginx/sites-available/omp
# 证书已有时 http-root 是 redirect，需确保仍带上 /m 不会被整站 301 掉问题：
# redirect 片段只有 location /，/m/ 在 include 于 http-root 时才会有；
# 当前 redirect 版不含 m.inc，HTTPS 下访问 /m 即可。HTTP 会 301 到 https://host/m/
cp "$APP/deploy/nginx-omp-http-root.inc" /tmp/omp-http-root-full.inc
if [ -f /etc/letsencrypt/live/omp.qjwater-gs.com/fullchain.pem ]; then
  # redirect 模式：先 include /m，再 301 其它（花括号需转义，因外层是 Python f-string）
  cat > /etc/nginx/sites-available/omp-http-root.inc <<'INC'
    include /etc/nginx/sites-available/omp-m.inc;
    location / {{
        return 301 https://$host$request_uri;
    }}
INC
else
  cp /tmp/omp-http-root-full.inc /etc/nginx/sites-available/omp-http-root.inc
fi
ln -sfn /etc/nginx/sites-available/omp /etc/nginx/sites-enabled/omp
nginx -t
systemctl reload nginx

echo '=== pm2 omp-api ==='
cd "$APP/apps/api"
if pm2 describe omp-api >/dev/null 2>&1; then
  pm2 restart omp-api --update-env
else
  PORT={API_PORT} NODE_ENV=production pm2 start dist/main.js --name omp-api --cwd "$APP/apps/api"
fi
pm2 save
sleep 5
# 重置完成后关闭开关，避免下次重启再次清空
if [ -f "$APP/.data_reset_superadmin_only.pending" ]; then
  sed -i 's|^OMP_RESET_DATA=.*|OMP_RESET_DATA=false|' "$APP/apps/api/.env" || true
  mv "$APP/.data_reset_superadmin_only.pending" "$APP/.data_reset_superadmin_only"
  pm2 restart omp-api --update-env
  sleep 3
fi
curl -s -o /dev/null -w 'omp_api=%{{http_code}}\\n' http://127.0.0.1:{API_PORT}/api/geo/config || true
curl -s -o /dev/null -w 'omp_web=%{{http_code}}\\n' http://127.0.0.1:{WEB_PORT}/ || true
pm2 list
echo DEPLOY_DONE
"""


def create_tarball(repo_root: Path, dest: Path) -> None:
    with tarfile.open(dest, "w:gz") as tar:
        for item in repo_root.iterdir():
            if item.name in EXCLUDE_DIRS or item.name in EXCLUDE_NAMES:
                continue
            if item.name.startswith("deploy") and item.is_file() and item.name.startswith("_"):
                continue
            tar.add(
                item,
                arcname=item.name,
                filter=_tar_filter,
            )


def _tar_filter(ti: tarfile.TarInfo) -> tarfile.TarInfo | None:
    parts = Path(ti.name).parts
    if any(p in EXCLUDE_DIRS for p in parts):
        return None
    if Path(ti.name).name in EXCLUDE_NAMES:
        return None
    if Path(ti.name).name == "_probe_server.py":
        return None
    return ti


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not PASSWORD:
        print(
            "请设置环境变量 DEPLOY_PASSWORD 后再运行，例如：\n"
            '  $env:DEPLOY_PASSWORD="你的密码"; python deploy/sync_upload_deploy_omp.py',
            file=sys.stderr,
        )
        return 2

    repo_root = Path(__file__).resolve().parents[1]
    web_env = _read_env_file(repo_root / "apps" / "web" / ".env")
    amap_key = (
        os.environ.get("VITE_AMAP_KEY")
        or web_env.get("VITE_AMAP_KEY")
        or ""
    ).strip()
    amap_security = (
        os.environ.get("VITE_AMAP_SECURITY_CODE")
        or web_env.get("VITE_AMAP_SECURITY_CODE")
        or ""
    ).strip()
    if not amap_key:
        print(
            "警告: 未找到 VITE_AMAP_KEY（apps/web/.env），线上地图将不可用",
            file=sys.stderr,
        )
    else:
        print(f"将注入高德 Web Key（长度 {len(amap_key)}）到生产构建")

    build_cmd = make_build_cmd(amap_key, amap_security)

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        local_tar = Path(tmp.name)

    try:
        print("Creating OMP deployment tarball...")
        create_tarball(repo_root, local_tar)
        size_mb = local_tar.stat().st_size / (1024 * 1024)
        print(f"Tarball size: {size_mb:.1f} MB")

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        print(f"Uploading to {HOST} ({USER})...")
        client.connect(
            HOST,
            username=USER,
            password=PASSWORD,
            timeout=30,
            allow_agent=False,
            look_for_keys=False,
        )
        sftp = client.open_sftp()
        sftp.put(str(local_tar), REMOTE_TAR)
        sftp.close()
        print("Upload complete. Building on server (may take several minutes)...")

        _, stdout, stderr = client.exec_command(build_cmd, timeout=1200, get_pty=True)
        output = ""
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                chunk = stdout.channel.recv(8192).decode("utf-8", "replace")
                output += chunk
                sys.stdout.write(chunk)
                sys.stdout.flush()
            time.sleep(0.3)
        rest = stdout.read().decode("utf-8", "replace")
        output += rest
        if rest:
            sys.stdout.write(rest)
        err = stderr.read().decode("utf-8", "replace")
        if err.strip():
            print("STDERR:", err)
        code = stdout.channel.recv_exit_status()
        client.close()
        ok = code == 0 and "DEPLOY_DONE" in output
        if ok:
            print("\n=== 部署成功 ===")
            print(f"管理后台: https://omp.qjwater-gs.com/  或  http://{HOST}:{WEB_PORT}/")
            print("移动端 H5: https://omp.qjwater-gs.com/m/")
            print("超级管理员: superadmin / Omp@2026Super（请尽快改密）")
            print(f"注意: 请在阿里云轻量防火墙放行 TCP {WEB_PORT}")
            print("旧项目 qjsl 不受影响 (仍占用 80/443/3000)")
        return 0 if ok else 1
    except Exception as exc:
        print(f"Failed: {exc}", file=sys.stderr)
        return 1
    finally:
        if local_tar.exists():
            local_tar.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())
