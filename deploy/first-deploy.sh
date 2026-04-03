#!/bin/bash
# 第一次部署，在 setup.sh 完成后运行
# 使用方法: bash deploy/first-deploy.sh your-domain.com
set -e

DOMAIN="${1:?请传入域名，例如: bash first-deploy.sh order.yourdomain.com}"
APP_DIR="/var/www/yeke-jewelry"

echo "=== [1/7] 创建 .env 文件 ==="
if [ ! -f "$APP_DIR/.env" ]; then
  # 生成随机 JWT secret
  SECRET=$(openssl rand -hex 32)
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="file:$APP_DIR/data/prod.db"
SESSION_SECRET="$SECRET"
NODE_ENV=production
EOF
  echo "✓ .env 创建完成（SESSION_SECRET 已随机生成）"
else
  echo "✓ .env 已存在，跳过"
fi

echo "=== [2/7] 创建数据目录 ==="
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/public/uploads"

echo "=== [3/7] 安装依赖 ==="
cd "$APP_DIR"
npm install --production=false

echo "=== [4/7] 生成 Prisma Client ==="
npx prisma generate

echo "=== [5/7] 初始化数据库 ==="
npx prisma migrate deploy
npx prisma db seed

echo "=== [6/7] 构建 ==="
npm run build

echo "=== [7/7] 配置 Nginx ==="
sudo cp deploy/nginx.conf /etc/nginx/sites-available/yeke-jewelry
# 替换域名
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/yeke-jewelry
sudo ln -sf /etc/nginx/sites-available/yeke-jewelry /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== 配置 HTTPS ==="
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || \
  echo "⚠ HTTPS 配置失败，请手动运行: sudo certbot --nginx -d $DOMAIN"

echo ""
echo "=== 启动应用 ==="
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
pm2 startup | tail -1 | sudo bash  # 设置开机自启

echo ""
echo "✓ 首次部署完成！"
echo "  访问: https://$DOMAIN"
echo ""
echo "测试账号:"
echo "  老板：18888888888 / boss123"
echo "  员工：13312345678 / staff123"
echo "  翁记工厂：17700000001 / factory123"
echo ""
echo "⚠ 上线前请修改默认密码！"
