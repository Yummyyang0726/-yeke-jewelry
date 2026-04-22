import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { factoryId, dateFrom, dateTo } = body

  if (!factoryId || !dateFrom || !dateTo) {
    return Response.json({ error: '缺少必要参数: factoryId, dateFrom, dateTo' }, { status: 400 })
  }

  const result = await prisma.deliveryNote.updateMany({
    where: {
      factoryId: parseInt(factoryId),
      noteDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    data: {
      paymentStatus: '已付',
      paymentDate: new Date().toISOString().split('T')[0],
    },
  })

  return Response.json({ updated: result.count })
}
