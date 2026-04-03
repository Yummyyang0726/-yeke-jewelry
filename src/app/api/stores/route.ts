import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const stores = await prisma.store.findMany({ orderBy: { id: 'asc' } })
  return Response.json(stores)
}
