# HTTPS — omp.qjwater-gs.com（由 setup_omp_https.py 部署）
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name omp.qjwater-gs.com;

    ssl_certificate     /etc/letsencrypt/live/omp.qjwater-gs.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omp.qjwater-gs.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL_OMP:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 20m;
    root /home/ubuntu/omp_platform/apps/web/dist;
    index index.html;

    include /etc/nginx/sites-available/omp-m.inc;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://omp_api_upstream/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
    }

    location /uploads/ {
        proxy_pass http://omp_api_upstream/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /socket.io/ {
        proxy_pass http://omp_api_upstream/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade_omp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
