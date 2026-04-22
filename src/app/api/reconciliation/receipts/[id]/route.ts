import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const receipt = await prisma.refineryReceipt.findUnique({
    where: { id: parseInt(id) },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      factory: true,
    },
  })

  if (!receipt) return Response.json({ error: '回收单不存在' }, { status: 404 })

  // Factory role: only see their own data
  if (session.role === 'factory' && receipt.factoryId !== session.factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  return Response.json(receipt)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const receiptId = parseInt(id)

  const existing = await prisma.refineryReceipt.findUnique({ where: { id: receiptId } })
  if (!existing) return Response.json({ error: '回收单不存在' }, { status: 404 })

  const body = await req.json()
  const { items = [], ...receiptData } = body

  const receipt = await prisma.$transaction(async (tx) => {
    await tx.refineryReceiptItem.deleteMany({ where: { receiptId } })

    return tx.refineryReceipt.update({
      where: { id: receiptId },
      data: {
        factoryId: receiptData.factoryId ? parseInt(receiptData.factoryId) : null,
        receiptNumber: receiptData.receiptNumber ?? '',
        receiptDate: receiptData.receiptDate,
        refineryName: receiptData.refineryName ?? '',
        totalIncoming: receiptData.totalIncoming != null ? parseFloat(receiptData.totalIncoming) : 0,
        totalPostMelt: receiptData.totalPostMelt != null ? parseFloat(receiptData.totalPostMelt) : 0,
        totalConverted: receiptData.totalConverted != null ? parseFloat(receiptData.totalConverted) : 0,
        shippedDate: receiptData.shippedDate || null,
        shippedWeight: receiptData.shippedWeight != null ? parseFloat(receiptData.shippedWeight) : 0,
        trackingNumber: receiptData.trackingNumber ?? '',
        notes: receiptData.notes ?? '',
        items: {
          create: items.map((item: {
            materialName?: string
            incomingWeight?: number
            postMeltWeight?: number
            conversionRate?: number
            convertedWeight?: number
            sortOrder?: number
          }, index: number) => ({
            materialName: item.materialName || '',
            incomingWeight: item.incomingWeight ? parseFloat(String(item.incomingWeight)) : 0,
            postMeltWeight: item.postMeltWeight ? parseFloat(String(item.postMeltWeight)) : 0,
            conversionRate: item.conversionRate ? parseFloat(String(item.conversionRate)) : 1.0,
            convertedWeight: item.convertedWeight ? parseFloat(String(item.convertedWeight)) : 0,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        factory: true,
      },
    })
  })

  return Response.json(receipt)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const receiptId = parseInt(id)

  const existing = await prisma.refineryReceipt.findUnique({ where: { id: receiptId } })
  if (!existing) return Response.json({ error: '回收单不存在' }, { status: 404 })

  await prisma.refineryReceipt.delete({ where: { id: receiptId } })

  return Response.json({ success: true })
}
