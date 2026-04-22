import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const noteId = parseInt(id)

  const existing = await prisma.deliveryNote.findUnique({ where: { id: noteId } })
  if (!existing) return Response.json({ error: '对账单不存在' }, { status: 404 })

  const body = await req.json()
  const { paymentStatus, paidAmount, paymentDate } = body

  const validStatuses = ['未付', '已付', '部分付']
  if (!validStatuses.includes(paymentStatus)) {
    return Response.json({ error: '无效的付款状态' }, { status: 400 })
  }

  const note = await prisma.deliveryNote.update({
    where: { id: noteId },
    data: {
      paymentStatus,
      paidAmount: paidAmount != null ? parseFloat(paidAmount) : existing.paidAmount,
      paymentDate: paymentDate || null,
    },
  })

  return Response.json(note)
}
