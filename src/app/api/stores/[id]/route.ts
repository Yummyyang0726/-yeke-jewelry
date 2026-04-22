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
  const { name, shortName, address, phone } = body

  if (!name?.trim() || !shortName?.trim()) {
    return Response.json({ error: '请填写门店名称和简称' }, { status: 400 })
  }

  const store = await prisma.store.update({
    where: { id: parseInt(id) },
    data: {
      name: name.trim(),
      shortName: shortName.trim(),
      address: address?.trim() ?? '',
      phone: phone?.trim() ?? '',
    },
  })

  return Response.json(store)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await ctx.params
  const storeId = parseInt(id)

  const orderCount = await prisma.order.count({ where: { storeId } })
  if (orderCount > 0) {
    return Response.json({ error: `该门店有 ${orderCount} 个关联订单，无法删除` }, { status: 400 })
  }

  await prisma.store.delete({ where: { id: storeId } })
  return Response.json({ ok: true })
}
