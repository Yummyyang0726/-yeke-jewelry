import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json()
  const { name, noteTemplate } = body

  if (!name?.trim()) {
    return Response.json({ error: '请填写工厂名称' }, { status: 400 })
  }

  const factory = await prisma.factory.update({
    where: { id: parseInt(id) },
    data: {
      name: name.trim(),
      ...(noteTemplate !== undefined ? { noteTemplate } : {}),
    },
  })

  return Response.json(factory)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await ctx.params
  const factoryId = parseInt(id)

  // Check if factory has orders
  const orderCount = await prisma.order.count({ where: { factoryId } })
  if (orderCount > 0) {
    return Response.json({ error: `该工厂有 ${orderCount} 个关联订单，无法删除` }, { status: 400 })
  }

  await prisma.factory.delete({ where: { id: factoryId } })
  return Response.json({ ok: true })
}
