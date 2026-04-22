import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const factoryId = parseInt(id)

  // Factory role: only see their own data
  if (session.role === 'factory' && session.factoryId !== factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const lastNote = await prisma.deliveryNote.findFirst({
    where: { factoryId },
    orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      currentOwedGold: true,
      currentOwedMoney: true,
      currentOwedGoldByMaterial: true,
    },
  })

  if (!lastNote) {
    // No previous note — check factory initial balances
    const factory = await prisma.factory.findUnique({
      where: { id: factoryId },
      select: {
        initialOwedGold: true,
        initialOwedMoney: true,
        initialOwedGoldByMaterial: true,
      },
    })

    return Response.json({
      currentOwedGold: factory?.initialOwedGold ?? 0,
      currentOwedMoney: factory?.initialOwedMoney ?? 0,
      currentOwedGoldByMaterial: factory?.initialOwedGoldByMaterial ?? '{}',
    })
  }

  return Response.json({
    currentOwedGold: lastNote.currentOwedGold,
    currentOwedMoney: lastNote.currentOwedMoney,
    currentOwedGoldByMaterial: lastNote.currentOwedGoldByMaterial ?? '{}',
  })
}
