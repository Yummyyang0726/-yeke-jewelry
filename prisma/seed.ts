import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import path from 'node:path'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

/**
 * 回购模块独立 DB。门店信息与订单系统的 Store 对齐（id/shortName 一致），
 * 但因为是独立物理库，必须单独插一遍。
 */
function seedRecycleStores() {
  const DB_PATH = process.env.RECYCLE_DB_PATH || path.join(process.cwd(), 'prisma', 'recycle.db')
  const rdb = new Database(DB_PATH)
  rdb.pragma('foreign_keys = ON')
  // 确保建表（importing recycle-db 会起副作用，这里简化直接 CREATE IF NOT EXISTS）
  rdb.exec(`
    CREATE TABLE IF NOT EXISTS RecycleStore (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      shortName  TEXT NOT NULL,
      address    TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  const stores = [
    { id: 1, name: '城隍庙二楼', shortName: '城隍庙二楼', address: '黄浦区丽水路88号城隍珠宝第一购物中心二楼210室', phone: '18121381563' },
    { id: 2, name: '城隍庙一楼', shortName: '城隍庙一楼', address: '黄浦区丽水路88号城隍珠宝第一购物中心一楼', phone: '18217114643' },
    { id: 3, name: '五角场万达', shortName: '五角场万达', address: '杨浦区国宾路58号万达影城一楼珠宝区城隍珠宝', phone: '13162708208' },
  ]
  const upsert = rdb.prepare(`
    INSERT INTO RecycleStore (id, name, shortName, address, phone)
    VALUES (@id, @name, @shortName, @address, @phone)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      shortName = excluded.shortName,
      address = excluded.address,
      phone = excluded.phone
  `)
  const tx = rdb.transaction(() => {
    for (const s of stores) upsert.run(s)
  })
  tx()
  rdb.close()
  console.log('回购门店:', stores.map((s) => s.shortName).join(' '))
}

async function main() {
  // 门店
  // 注意：以下 upsert 的 update 段必须写全字段，否则改名后重跑 seed 不会刷新。
  const store1 = await prisma.store.upsert({
    where: { id: 1 },
    update: {
      name: '城隍庙二楼',
      shortName: '城隍庙二楼',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心二楼210室',
      phone: '18121381563',
    },
    create: {
      name: '城隍庙二楼',
      shortName: '城隍庙二楼',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心二楼210室',
      phone: '18121381563',
    },
  })
  const store2 = await prisma.store.upsert({
    where: { id: 2 },
    update: {
      name: '城隍庙一楼',
      shortName: '城隍庙一楼',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心一楼',
      phone: '18217114643',
    },
    create: {
      name: '城隍庙一楼',
      shortName: '城隍庙一楼',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心一楼',
      phone: '18217114643',
    },
  })
  const store3 = await prisma.store.upsert({
    where: { id: 3 },
    update: {
      name: '五角场万达',
      shortName: '五角场万达',
      address: '杨浦区国宾路58号万达影城一楼珠宝区城隍珠宝',
      phone: '13162708208',
    },
    create: {
      name: '五角场万达',
      shortName: '五角场万达',
      address: '杨浦区国宾路58号万达影城一楼珠宝区城隍珠宝',
      phone: '13162708208',
    },
  })

  // 工厂
  const f1 = await prisma.factory.upsert({
    where: { id: 1 },
    update: {},
    create: { name: '翁记' },
  })
  const f2 = await prisma.factory.upsert({
    where: { id: 2 },
    update: {},
    create: { name: '小沈阳' },
  })
  const f3 = await prisma.factory.upsert({
    where: { id: 3 },
    update: {},
    create: { name: '自己做货（汪师傅）' },
  })
  const f4 = await prisma.factory.upsert({
    where: { id: 4 },
    update: {},
    create: { name: '深圳品牌' },
  })

  // 所有账号密码都是 1234（简化记忆）
  const defaultHash = await bcrypt.hash('1234', 10)

  // 用户：老板
  await prisma.user.upsert({
    where: { phone: 'boss' },
    update: {},
    create: {
      phone: 'boss',
      passwordHash: defaultHash,
      name: '老板',
      role: 'boss',
    },
  })

  // 用户：员工
  await prisma.user.upsert({
    where: { phone: 'yuangong' },
    update: {},
    create: {
      phone: 'yuangong',
      passwordHash: defaultHash,
      name: '张员工',
      role: 'employee',
    },
  })

  // 用户：工厂账号
  await prisma.user.upsert({
    where: { phone: 'wengji' },
    update: {},
    create: {
      phone: 'wengji',
      passwordHash: defaultHash,
      name: '翁记师傅',
      role: 'factory',
      factoryId: f1.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: 'xiaoshenyang' },
    update: {},
    create: {
      phone: 'xiaoshenyang',
      passwordHash: defaultHash,
      name: '小沈阳师傅',
      role: 'factory',
      factoryId: f2.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: 'wangshifu' },
    update: {},
    create: {
      phone: 'wangshifu',
      passwordHash: defaultHash,
      name: '汪师傅',
      role: 'factory',
      factoryId: f3.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: 'shenzhen' },
    update: {},
    create: {
      phone: 'shenzhen',
      passwordHash: defaultHash,
      name: '深圳品牌师傅',
      role: 'factory',
      factoryId: f4.id,
    },
  })

  // 回购模块（独立 DB）
  seedRecycleStores()

  console.log('Seed complete ✓')
  console.log('门店:', store1.shortName, store2.shortName, store3.shortName)
  console.log('工厂:', f1.name, f2.name, f3.name, f4.name)
  console.log('账号（密码全部 1234）:')
  console.log('  老板:   boss')
  console.log('  员工:   yuangong')
  console.log('  翁记:   wengji')
  console.log('  小沈阳: xiaoshenyang')
  console.log('  汪师傅: wangshifu')
  console.log('  深圳:   shenzhen')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
