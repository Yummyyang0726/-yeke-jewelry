import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'factory') return Response.json({ error: '只有工厂可以提交结算' }, { status: 403 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id: parseInt(id) } })
  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 })
  if (order.factoryId !== session.factoryId) return Response.json({ error: '无权限' }, { status: 403 })
  if (order.status !== '生产中') return Response.json({ error: '只有生产中的订单可以提交结算' }, { status: 400 })

  const body = await req.json()
  const pf = (v: unknown) => (v !== undefined && v !== '' && v !== null ? parseFloat(String(v)) : null)

  const settlement = await prisma.settlement.upsert({
    where: { orderId: order.id },
    update: {
      goldMaterial: body.goldMaterial || null,
      goldLoss: pf(body.goldLoss),
      goldWeight: pf(body.goldWeight),
      goldUnitPrice: pf(body.goldUnitPrice),
      goldAmount: pf(body.goldAmount),
      stone1Material: body.stone1Material || null,
      stone1Weight: pf(body.stone1Weight),
      stone1Price: pf(body.stone1Price),
      stone1Amount: pf(body.stone1Amount),
      stone2Material: body.stone2Material || null,
      stone2Weight: pf(body.stone2Weight),
      stone2Price: pf(body.stone2Price),
      stone2Amount: pf(body.stone2Amount),
      oldOffset1: body.oldOffset1 || null,
      oldOffsetAmount1: pf(body.oldOffsetAmount1),
      oldOffset2: body.oldOffset2 || null,
      oldOffsetAmount2: pf(body.oldOffsetAmount2),
      oldOffset3: body.oldOffset3 || null,
      oldOffsetAmount3: pf(body.oldOffsetAmount3),
      oldOffset4: body.oldOffset4 || null,
      oldOffsetAmount4: pf(body.oldOffsetAmount4),
      purchaseMaterial: body.purchaseMaterial || null,
      purchaseAmount: pf(body.purchaseAmount),
      actualLaborFee: pf(body.actualLaborFee),
      actualGoldWeight: pf(body.actualGoldWeight),
      totalAmount: pf(body.totalAmount),
    },
    create: {
      orderId: order.id,
      goldMaterial: body.goldMaterial || null,
      goldLoss: pf(body.goldLoss),
      goldWeight: pf(body.goldWeight),
      goldUnitPrice: pf(body.goldUnitPrice),
      goldAmount: pf(body.goldAmount),
      stone1Material: body.stone1Material || null,
      stone1Weight: pf(body.stone1Weight),
      stone1Price: pf(body.stone1Price),
      stone1Amount: pf(body.stone1Amount),
      stone2Material: body.stone2Material || null,
      stone2Weight: pf(body.stone2Weight),
      stone2Price: pf(body.stone2Price),
      stone2Amount: pf(body.stone2Amount),
      oldOffset1: body.oldOffset1 || null,
      oldOffsetAmount1: pf(body.oldOffsetAmount1),
      oldOffset2: body.oldOffset2 || null,
      oldOffsetAmount2: pf(body.oldOffsetAmount2),
      oldOffset3: body.oldOffset3 || null,
      oldOffsetAmount3: pf(body.oldOffsetAmount3),
      oldOffset4: body.oldOffset4 || null,
      oldOffsetAmount4: pf(body.oldOffsetAmount4),
      purchaseMaterial: body.purchaseMaterial || null,
      purchaseAmount: pf(body.purchaseAmount),
      actualLaborFee: pf(body.actualLaborFee),
      actualGoldWeight: pf(body.actualGoldWeight),
      totalAmount: pf(body.totalAmount),
    },
  })

  // Advance status to 已完成
  await prisma.order.update({ where: { id: order.id }, data: { status: '已完成' } })
  await prisma.statusLog.create({
    data: {
      orderId: order.id,
      fromStatus: '生产中',
      toStatus: '已完成',
      operatedBy: session.userId,
      note: '工厂提交结算',
    },
  })

  return Response.json(settlement, { status: 201 })
}
