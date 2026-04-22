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

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { stones = [], materials = [], ...orderData } = body

  const order = await prisma.order.findUnique({ where: { id: parseInt(id) } })
  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 })

  // Update order + replace stones and materials
  const updated = await prisma.$transaction(async (tx) => {
    // Delete old stones and materials
    await tx.orderStone.deleteMany({ where: { orderId: order.id } })
    await tx.orderMaterial.deleteMany({ where: { orderId: order.id } })

    // Update order
    return tx.order.update({
      where: { id: order.id },
      data: {
        storeId: parseInt(orderData.storeId),
        factoryId: parseInt(orderData.factoryId),
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        category: orderData.category,
        size: orderData.size || null,
        laborFee: orderData.laborFee ? parseFloat(orderData.laborFee) : null,
        goldPrice: orderData.goldPrice ? parseFloat(orderData.goldPrice) : null,
        materialDesc: orderData.materialDesc || null,
        remarks: orderData.remarks || null,
        orderDate: orderData.orderDate,
        stones: {
          create: stones.map((s: { stoneType: string; quantityWeight: string; unitPrice?: string; girdleCode?: string; stoneNote?: string }) => ({
            stoneType: s.stoneType,
            quantityWeight: s.quantityWeight,
            unitPrice: s.unitPrice ? parseFloat(s.unitPrice) : null,
            girdleCode: s.girdleCode || null,
            stoneNote: s.stoneNote || null,
          })),
        },
        materials: {
          create: materials.map((m: { category: string; quantityWeight: string; gemSize?: string; girdleCode?: string; materialNote?: string }) => ({
            category: m.category,
            quantityWeight: m.quantityWeight,
            gemSize: m.gemSize || null,
            girdleCode: m.girdleCode || null,
            materialNote: m.materialNote || null,
          })),
        },
      },
    })
  })

  return Response.json(updated)
}
