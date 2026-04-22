import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    include: { factory: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    factoryId: u.factoryId,
    factoryName: u.factory?.name ?? null,
    createdAt: u.createdAt,
  }))

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { name, phone, password, role, factoryId } = body

  if (!name || !phone || !password || !role) {
    return Response.json({ error: '请填写必要信息' }, { status: 400 })
  }

  if (!['boss', 'employee', 'factory'].includes(role)) {
    return Response.json({ error: '角色无效' }, { status: 400 })
  }

  if (role === 'factory' && !factoryId) {
    return Response.json({ error: '工厂角色需要关联工厂' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { phone } })
  if (existing) {
    return Response.json({ error: '手机号已存在' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      passwordHash,
      role,
      factoryId: role === 'factory' ? parseInt(factoryId) : null,
    },
  })

  return Response.json({ id: user.id, name: user.name, phone: user.phone, role: user.role }, { status: 201 })
}
