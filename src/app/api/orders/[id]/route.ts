import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: {
      store: true,
      factory: true,
      stones: true,
      materials: true,
      images: { orderBy: { createdAt: 'asc' } },
      settlement: true,
      statusLogs: {
        include: { operator: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      createdBy: { select: { name: true } },
    },
  })

  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 })

  // Factory: only see own orders
  if (session.role === 'factory' && order.factoryId !== session.factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const isBoss = session.role === 'boss'

  // Strip fee fields for employee role
  const result = {
    ...order,
    laborFee: isBoss ? order.laborFee : undefined,
    goldPrice: isBoss ? order.goldPrice : undefined,
    stones: order.stones.map((s) => ({
      ...s,
      unitPrice: isBoss ? s.unitPrice : undefined,
    })),
    settlement: isBoss ? order.settlement : undefined,
  }

  return Response.json(result)
}
