import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await ctx.params
  const userId = parseInt(id)
  const body = await req.json()
  const { name, phone, password, role, factoryId } = body

  if (!name || !phone || !role) {
    return Response.json({ error: '请填写必要信息' }, { status: 400 })
  }

  // Check phone uniqueness (excluding self)
  const existing = await prisma.user.findFirst({
    where: { phone, id: { not: userId } },
  })
  if (existing) {
    return Response.json({ error: '手机号已存在' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    name,
    phone,
    role,
    factoryId: role === 'factory' ? parseInt(factoryId) : null,
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  })

  return Response.json({ id: user.id, name: user.name, phone: user.phone, role: user.role })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await ctx.params
  const userId = parseInt(id)

  // Don't allow deleting yourself
  if (userId === session.userId) {
    return Response.json({ error: '不能删除自己的账号' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })
  return Response.json({ ok: true })
}
