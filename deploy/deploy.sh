#!/bin/bash
# 每次更新代码后运行，完成构建和重启
# 使用方法（在 /var/www/yeke-jewelry 目录下）: bash deploy/deploy.sh
set -e

APP_DIR="/var/www/yeke-jewelry"
cd "$APP_DIR"

echo "=== [1/6] 拉取最新代码 ==="
git pull

echo "=== [2/6] 安装依赖 ==="
npm install --production=false

echo "=== [3/6] 生成 Prisma Client ==="
npx prisma generate

echo "=== [4/6] 执行数据库迁移 ==="
npx prisma migrate deploy

echo "=== [5/6] 构建 Next.js ==="
npm run build

echo "=== [6/6] 重启 PM2 进程 ==="
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

echo ""
echo "✓ 部署完成！"
pm2 status
