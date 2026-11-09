# 证书就绪后：HTTP 跳转 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
