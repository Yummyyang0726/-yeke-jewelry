import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const factoryId = searchParams.get('factoryId')
  const paymentStatus = searchParams.get('paymentStatus')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  // Factory role: only see their own data
  if (session.role === 'factory') {
    where.factoryId = session.factoryId
  } else {
    if (factoryId) where.factoryId = parseInt(factoryId)
  }

  if (paymentStatus) where.paymentStatus = paymentStatus

  if (dateFrom || dateTo) {
    where.noteDate = {}
    if (dateFrom) where.noteDate.gte = dateFrom
    if (dateTo) where.noteDate.lte = dateTo
  }

  const notes = await prisma.deliveryNote.findMany({
    where,
    include: {
      factory: { select: { name: true } },
      items: true,
    },
    orderBy: { noteDate: 'desc' },
  })

  const result = notes.map((n) => ({
    ...n,
    factoryName: n.factory.name,
    itemsCount: n.items.length,
  }))

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { items = [], ...noteData } = body

  const note = await prisma.deliveryNote.create({
    data: {
      factoryId: parseInt(noteData.factoryId),
      noteDate: noteData.noteDate,
      noteNumber: noteData.noteNumber || '',
      factoryNoteNumber: noteData.factoryNoteNumber || '',
      settlementMethod: noteData.settlementMethod || '',
      materialType: noteData.materialType || '',
      goldPrice: noteData.goldPrice ? parseFloat(noteData.goldPrice) : 0,
      goldPriceByMaterial: typeof noteData.goldPriceByMaterial === 'string'
        ? noteData.goldPriceByMaterial
        : JSON.stringify(noteData.goldPriceByMaterial ?? {}),
      totalGoldWeight: noteData.totalGoldWeight ? parseFloat(noteData.totalGoldWeight) : 0,
      totalFee: noteData.totalFee ? parseFloat(noteData.totalFee) : 0,
      settledGoldWeight: noteData.settledGoldWeight ? parseFloat(noteData.settledGoldWeight) : 0,
      settledAmount: noteData.settledAmount ? parseFloat(noteData.settledAmount) : 0,
      prevOwedGold: noteData.prevOwedGold ? parseFloat(noteData.prevOwedGold) : 0,
      prevOwedMoney: noteData.prevOwedMoney ? parseFloat(noteData.prevOwedMoney) : 0,
      currentOwedGold: noteData.currentOwedGold ? parseFloat(noteData.currentOwedGold) : 0,
      currentOwedMoney: noteData.currentOwedMoney ? parseFloat(noteData.currentOwedMoney) : 0,
      prevOwedGoldByMaterial: typeof noteData.prevOwedGoldByMaterial === 'string'
        ? noteData.prevOwedGoldByMaterial
        : JSON.stringify(noteData.prevOwedGoldByMaterial ?? {}),
      currentOwedGoldByMaterial: typeof noteData.currentOwedGoldByMaterial === 'string'
        ? noteData.currentOwedGoldByMaterial
        : JSON.stringify(noteData.currentOwedGoldByMaterial ?? {}),
      notes: noteData.notes || '',
      receiptId: noteData.receiptId ? parseInt(noteData.receiptId) : null,
      items: {
        create: items.map((item: {
          itemType?: string
          materialType?: string
          internalNumber?: string
          barcode?: string
          productName: string
          quantity?: number
          goldWeight?: number
          feePerGram?: number
          feePerPiece?: number
          lineTotal?: number
          sortOrder?: number
        }, index: number) => ({
          itemType: item.itemType || '定制',
          materialType: item.materialType || '18K',
          internalNumber: item.internalNumber || '',
          barcode: item.barcode || '',
          productName: item.productName,
          quantity: item.quantity ?? 1,
          goldWeight: item.goldWeight != null ? parseFloat(String(item.goldWeight)) : 0,
          feePerGram: item.feePerGram ? parseFloat(String(item.feePerGram)) : 0,
          feePerPiece: item.feePerPiece ? parseFloat(String(item.feePerPiece)) : 0,
          lineTotal: item.lineTotal ? parseFloat(String(item.lineTotal)) : 0,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      factory: { select: { name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return Response.json(note, { status: 201 })
}
