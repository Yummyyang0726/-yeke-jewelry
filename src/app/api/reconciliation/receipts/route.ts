import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const factoryId = searchParams.get('factoryId')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  // Factory role: only see their own data
  if (session.role === 'factory') {
    where.factoryId = session.factoryId
  } else {
    if (factoryId) where.factoryId = parseInt(factoryId)
  }

  const receipts = await prisma.refineryReceipt.findMany({
    where,
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      factory: { select: { name: true } },
    },
    orderBy: { receiptDate: 'desc' },
  })

  const result = receipts.map((r) => ({
    ...r,
    factoryName: r.factory?.name ?? null,
  }))

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { items = [], ...receiptData } = body

  const receipt = await prisma.refineryReceipt.create({
    data: {
      factoryId: receiptData.factoryId ? parseInt(receiptData.factoryId) : null,
      receiptNumber: receiptData.receiptNumber || '',
      receiptDate: receiptData.receiptDate,
      refineryName: receiptData.refineryName || '',
      totalIncoming: receiptData.totalIncoming ? parseFloat(receiptData.totalIncoming) : 0,
      totalPostMelt: receiptData.totalPostMelt ? parseFloat(receiptData.totalPostMelt) : 0,
      totalConverted: receiptData.totalConverted ? parseFloat(receiptData.totalConverted) : 0,
      shippedDate: receiptData.shippedDate || null,
      shippedWeight: receiptData.shippedWeight ? parseFloat(receiptData.shippedWeight) : 0,
      trackingNumber: receiptData.trackingNumber || '',
      notes: receiptData.notes || '',
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
      factory: { select: { name: true } },
    },
  })

  return Response.json(receipt, { status: 201 })
}
