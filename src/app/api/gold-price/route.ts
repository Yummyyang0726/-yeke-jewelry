import { getSession } from '@/lib/session'
import { getCachedPrices, refreshPrices } from '@/lib/gold-price'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  return Response.json(getCachedPrices())
}

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const prices = await refreshPrices()
  return Response.json(prices)
}
