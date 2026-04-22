import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const note = await prisma.deliveryNote.findUnique({
    where: { id: parseInt(id) },
    include: {
      factory: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!note) return Response.json({ error: '对账单不存在' }, { status: 404 })

  // Factory role: only see their own data
  if (session.role === 'factory' && note.factoryId !== session.factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  return Response.json(note)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const noteId = parseInt(id)

  const existing = await prisma.deliveryNote.findUnique({ where: { id: noteId } })
  if (!existing) return Response.json({ error: '对账单不存在' }, { status: 404 })

  const body = await req.json()
  const { items = [], ...noteData } = body

  // Delete old items and create new ones in a transaction
  const note = await prisma.$transaction(async (tx) => {
    await tx.deliveryItem.deleteMany({ where: { deliveryNoteId: noteId } })

    return tx.deliveryNote.update({
      where: { id: noteId },
      data: {
        factoryId: noteData.factoryId ? parseInt(noteData.factoryId) : undefined,
        noteDate: noteData.noteDate,
        noteNumber: noteData.noteNumber ?? '',
        factoryNoteNumber: noteData.factoryNoteNumber ?? '',
        settlementMethod: noteData.settlementMethod ?? '',
        materialType: noteData.materialType ?? '',
        goldPrice: noteData.goldPrice != null ? parseFloat(noteData.goldPrice) : 0,
        goldPriceByMaterial: typeof noteData.goldPriceByMaterial === 'string'
          ? noteData.goldPriceByMaterial
          : JSON.stringify(noteData.goldPriceByMaterial ?? {}),
        totalGoldWeight: noteData.totalGoldWeight != null ? parseFloat(noteData.totalGoldWeight) : 0,
        totalFee: noteData.totalFee != null ? parseFloat(noteData.totalFee) : 0,
        settledGoldWeight: noteData.settledGoldWeight != null ? parseFloat(noteData.settledGoldWeight) : 0,
        settledAmount: noteData.settledAmount != null ? parseFloat(noteData.settledAmount) : 0,
        prevOwedGold: noteData.prevOwedGold != null ? parseFloat(noteData.prevOwedGold) : 0,
        prevOwedMoney: noteData.prevOwedMoney != null ? parseFloat(noteData.prevOwedMoney) : 0,
        currentOwedGold: noteData.currentOwedGold != null ? parseFloat(noteData.currentOwedGold) : 0,
        currentOwedMoney: noteData.currentOwedMoney != null ? parseFloat(noteData.currentOwedMoney) : 0,
        prevOwedGoldByMaterial: typeof noteData.prevOwedGoldByMaterial === 'string'
          ? noteData.prevOwedGoldByMaterial
          : JSON.stringify(noteData.prevOwedGoldByMaterial ?? {}),
        currentOwedGoldByMaterial: typeof noteData.currentOwedGoldByMaterial === 'string'
          ? noteData.currentOwedGoldByMaterial
          : JSON.stringify(noteData.currentOwedGoldByMaterial ?? {}),
        notes: noteData.notes ?? '',
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
        factory: true,
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })
  })

  return Response.json(note)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const noteId = parseInt(id)

  const existing = await prisma.deliveryNote.findUnique({ where: { id: noteId } })
  if (!existing) return Response.json({ error: '对账单不存在' }, { status: 404 })

  await prisma.deliveryNote.delete({ where: { id: noteId } })

  return Response.json({ success: true })
}
