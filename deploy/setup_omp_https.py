"""为 omp.qjwater-gs.com 申请 Let's Encrypt 证书并启用 HTTPS（手动方案，不依赖阿里云一键 HTTPS）。"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "116.62.238.95")
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
USER = os.environ.get("DEPLOY_USER", "root")
DOMAIN = os.environ.get("OMP_DOMAIN", "omp.qjwater-gs.com")
EMAIL = os.environ.get("OMP_SSL_EMAIL", "admin@qjwater-gs.com")
APP_DIR = "/home/ubuntu/omp_platform"

REMOTE_SCRIPT = f"""
set -e
DOMAIN="{DOMAIN}"
EMAIL="{EMAIL}"
APP="{APP_DIR}"
DEPLOY="$APP/deploy"

mkdir -p /var/www/certbot
mkdir -p /etc/nginx/sites-available

# 占位 include，避免 nginx -t 失败
echo '# ssl pending' > /etc/nginx/sites-available/omp-ssl.inc
cp "$DEPLOY/nginx-omp-http-root.inc" /etc/nginx/sites-available/omp-http-root.inc
cp "$DEPLOY/nginx-omp.conf" /etc/nginx/sites-available/omp
ln -sfn /etc/nginx/sites-available/omp /etc/nginx/sites-enabled/omp

nginx -t
systemctl reload nginx

if ! command -v certbot >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y certbot
fi

certbot certonly --webroot -w /var/www/certbot \\
  -d "$DOMAIN" \\
  --email "$EMAIL" \\
  --agree-tos --non-interactive --keep-until-expiring

test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
test -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem"

cp "$DEPLOY/nginx-omp-ssl.inc" /etc/nginx/sites-available/omp-ssl.inc
cp "$DEPLOY/nginx-omp-http-redirect.inc" /etc/nginx/sites-available/omp-http-root.inc

nginx -t
systemctl reload nginx

mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

curl -sk -o /dev/null -w "https_local=%{{http_code}}\\n" --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true
echo HTTPS_SETUP_DONE
"""


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not PASSWORD:
        print(
            '请先设置 DEPLOY_PASSWORD，例如：\n'
            '  $env:DEPLOY_PASSWORD="你的密码"; python deploy/setup_omp_https.py',
            file=sys.stderr,
        )
        return 2

    repo = Path(__file__).resolve().parents[1]
    files = [
        "nginx-omp.conf",
        "nginx-omp-ssl.inc",
        "nginx-omp-http-root.inc",
        "nginx-omp-http-redirect.inc",
    ]

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {HOST} ...")
    client.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )
    sftp = client.open_sftp()
    remote_deploy = f"{APP_DIR}/deploy"
    client.exec_command(f"mkdir -p {remote_deploy}")[1].channel.recv_exit_status()
    for name in files:
        sftp.put(str(repo / "deploy" / name), f"{remote_deploy}/{name}")
        print(f"uploaded {name}")
    sftp.close()

    print("Installing certbot + requesting certificate...")
    _, stdout, stderr = client.exec_command(REMOTE_SCRIPT, timeout=600, get_pty=True)
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

    ok = code == 0 and "HTTPS_SETUP_DONE" in output
    if ok:
        print(f"\n=== HTTPS 已启用 ===\n请访问: https://{DOMAIN}/")
        print("微信小程序后台 → request 合法域名填该地址即可。")
    else:
        print("HTTPS 配置失败，请查看上方日志。", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
