import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  // 门店
  const store1 = await prisma.store.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '豫园一楼修理部',
      shortName: '一店',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心一楼',
      phone: '18217114643',
    },
  })
  const store2 = await prisma.store.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: '豫园二楼210室',
      shortName: '二店',
      address: '黄浦区丽水路88号城隍珠宝第一购物中心二楼210室',
      phone: '18121381563',
    },
  })
  const store3 = await prisma.store.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: '杨浦万达店',
      shortName: '三店',
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

  // 用户：老板
  await prisma.user.upsert({
    where: { phone: '18888888888' },
    update: {},
    create: {
      phone: '18888888888',
      passwordHash: await bcrypt.hash('boss123', 10),
      name: '老板',
      role: 'boss',
    },
  })

  // 用户：员工
  await prisma.user.upsert({
    where: { phone: '13312345678' },
    update: {},
    create: {
      phone: '13312345678',
      passwordHash: await bcrypt.hash('staff123', 10),
      name: '张员工',
      role: 'employee',
    },
  })

  // 用户：工厂账号
  await prisma.user.upsert({
    where: { phone: '17700000001' },
    update: {},
    create: {
      phone: '17700000001',
      passwordHash: await bcrypt.hash('factory123', 10),
      name: '翁记师傅',
      role: 'factory',
      factoryId: f1.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: '17700000002' },
    update: {},
    create: {
      phone: '17700000002',
      passwordHash: await bcrypt.hash('factory123', 10),
      name: '小沈阳师傅',
      role: 'factory',
      factoryId: f2.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: '17700000003' },
    update: {},
    create: {
      phone: '17700000003',
      passwordHash: await bcrypt.hash('factory123', 10),
      name: '汪师傅',
      role: 'factory',
      factoryId: f3.id,
    },
  })
  await prisma.user.upsert({
    where: { phone: '17700000004' },
    update: {},
    create: {
      phone: '17700000004',
      passwordHash: await bcrypt.hash('factory123', 10),
      name: '深圳品牌师傅',
      role: 'factory',
      factoryId: f4.id,
    },
  })

  console.log('Seed complete ✓')
  console.log('门店:', store1.shortName, store2.shortName, store3.shortName)
  console.log('工厂:', f1.name, f2.name, f3.name, f4.name)
  console.log('账号:')
  console.log('  老板:   18888888888 / boss123')
  console.log('  员工:   13312345678 / staff123')
  console.log('  翁记:   17700000001 / factory123')
  console.log('  小沈阳: 17700000002 / factory123')
  console.log('  汪师傅: 17700000003 / factory123')
  console.log('  深圳:   17700000004 / factory123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
