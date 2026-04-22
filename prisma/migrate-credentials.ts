// One-off: 把手机号账号改成拼音短账号，密码统一 1234
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

// [旧手机号, 新账号, 新显示名(null=保留)]
const RENAME: Array<[string, string, string | null]> = [
  ['18888888888', 'boss', null],
  ['13312345678', 'yuangong', null],
  ['17700000001', 'wengji', null],
  ['17700000002', 'xiaoshenyang', null],
  ['17700000003', 'wangshifu', null],
  ['17700000004', 'shenzhen', null],
]

async function main() {
  const newHash = await bcrypt.hash('1234', 10)

  for (const [oldPhone, newAccount, newName] of RENAME) {
    const u = await prisma.user.findUnique({ where: { phone: oldPhone } })
    if (!u) {
      console.log(`跳过: 未找到 ${oldPhone}`)
      continue
    }
    await prisma.user.update({
      where: { id: u.id },
      data: {
        phone: newAccount,
        passwordHash: newHash,
        ...(newName ? { name: newName } : {}),
      },
    })
    console.log(`✓ ${oldPhone} → ${newAccount}`)
  }

  // 给鑫喜珠宝补一个账号
  const xinxi = await prisma.factory.findFirst({ where: { name: '鑫喜珠宝' } })
  if (xinxi) {
    await prisma.user.upsert({
      where: { phone: 'xinxi' },
      update: { passwordHash: newHash, factoryId: xinxi.id },
      create: {
        phone: 'xinxi',
        passwordHash: newHash,
        name: '鑫喜珠宝师傅',
        role: 'factory',
        factoryId: xinxi.id,
      },
    })
    console.log(`✓ 鑫喜珠宝 → xinxi`)
  } else {
    console.log('跳过: 未找到工厂"鑫喜珠宝"')
  }

  console.log('\n全部账号密码统一为 1234')
}

main().finally(() => prisma.$disconnect())
