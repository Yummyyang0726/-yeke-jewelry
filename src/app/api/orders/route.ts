import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

// Generate order number: YYYYMMDD + 2-digit sequence
async function generateOrderNo(): Promise<string> {
  const today = format(new Date(), 'yyyyMMdd')
  const prefix = today
  const count = await prisma.order.count({
    where: { orderNo: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const storeId = searchParams.get('storeId')
  const status = searchParams.get('status')
  const factoryId = searchParams.get('factoryId')

  const where: Record<string, unknown> = {}

  // Factory role: only see their own orders
  if (session.role === 'factory') {
    where.factoryId = session.factoryId
  } else {
    if (storeId) where.storeId = parseInt(storeId)
    if (factoryId) where.factoryId = parseInt(factoryId)
  }
  if (status) where.status = status

  const orders = await prisma.order.findMany({
    where,
    include: {
      store: { select: { shortName: true } },
      factory: { select: { name: true } },
      images: { where: { imageType: 'cad' }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const isBoss = session.role === 'boss'

  const result = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    storeName: o.store.shortName,
    factoryName: o.factory.name,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    category: o.category,
    deliveryDate: o.deliveryDate,
    status: o.status,
    hasCad: o.images.length > 0,
    laborFee: isBoss ? o.laborFee : undefined,
    createdAt: o.createdAt,
  }))

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { stones = [], materials = [], ...orderData } = body

  const orderNo = await generateOrderNo()

  const order = await prisma.order.create({
    data: {
      orderNo,
      storeId: parseInt(orderData.storeId),
      factoryId: parseInt(orderData.factoryId),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      category: orderData.category,
      size: orderData.size || null,
      laborFee: orderData.laborFee ? parseFloat(orderData.laborFee) : null,
      goldPrice: orderData.goldPrice ? parseFloat(orderData.goldPrice) : null,
      materialDesc: orderData.materialDesc || null,
      styleNotes: orderData.styleNotes || null,
      remarks: orderData.remarks || null,
      deliveryDate: orderData.deliveryDate,
      createdById: session.userId,
      stones: {
        create: stones.map((s: { stoneType: string; quantityWeight: string; unitPrice?: string }) => ({
          stoneType: s.stoneType,
          quantityWeight: s.quantityWeight,
          unitPrice: s.unitPrice ? parseFloat(s.unitPrice) : null,
        })),
      },
      materials: {
        create: materials.map((m: { category: string; quantityWeight: string; gemSize?: string }) => ({
          category: m.category,
          quantityWeight: m.quantityWeight,
          gemSize: m.gemSize || null,
        })),
      },
    },
    include: {
      store: true,
      factory: true,
      stones: true,
      materials: true,
    },
  })

  // Log status
  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      fromStatus: null,
      toStatus: '待接单',
      operatedBy: session.userId,
      note: '创建订单',
    },
  })

  return Response.json(order, { status: 201 })
}
