import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

const STATUS_FLOW: Record<string, string[]> = {
  待接单: ['待出图'],           // factory confirms
  待出图: ['CAD待确认'],        // factory uploads CAD
  CAD待确认: ['生产中'],        // boss/employee confirms CAD
  生产中: ['已完成'],           // factory submits settlement
  已完成: ['已取件'],           // store marks picked up
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { toStatus, note } = await req.json()

  const order = await prisma.order.findUnique({ where: { id: parseInt(id) } })
  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 })

  // Factory can only update their own orders
  if (session.role === 'factory' && order.factoryId !== session.factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const allowed = STATUS_FLOW[order.status] ?? []
  if (!allowed.includes(toStatus)) {
    return Response.json(
      { error: `当前状态"${order.status}"不能变更为"${toStatus}"` },
      { status: 400 }
    )
  }

  // Permission checks
  if (toStatus === '待出图' && session.role !== 'factory') {
    return Response.json({ error: '只有工厂可以接单' }, { status: 403 })
  }
  if (toStatus === '生产中' && session.role === 'factory') {
    return Response.json({ error: '只有门店/老板可以确认CAD' }, { status: 403 })
  }
  if (toStatus === '已取件' && session.role === 'factory') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: toStatus },
  })

  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus,
      operatedBy: session.userId,
      note: note || null,
    },
  })

  return Response.json(updated)
}
