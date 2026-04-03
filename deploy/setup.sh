#!/bin/bash
# 首次在 VPS 上运行，安装所有依赖
# 使用方法: bash setup.sh
set -e

echo "=== 1. 安装 Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 2. 安装 PM2 ==="
sudo npm install -g pm2

echo "=== 3. 安装 Nginx ==="
sudo apt-get install -y nginx

echo "=== 4. 安装 Certbot (HTTPS) ==="
sudo apt-get install -y certbot python3-certbot-nginx

echo "=== 5. 创建应用目录 ==="
sudo mkdir -p /var/www/yeke-jewelry
sudo chown $USER:$USER /var/www/yeke-jewelry

echo ""
echo "✓ 基础环境安装完成"
echo ""
echo "下一步："
echo "  1. 把代码传到 /var/www/yeke-jewelry"
echo "  2. 运行 deploy/deploy.sh"
