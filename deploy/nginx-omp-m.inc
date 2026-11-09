# 移动端 H5（手机浏览器试用）
location = /m {
    return 301 /m/;
}

location /m/ {
    root /home/ubuntu/omp_platform/public;
    try_files $uri $uri/ /m/index.html;
}
