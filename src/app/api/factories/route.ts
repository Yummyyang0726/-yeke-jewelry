import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const factories = await prisma.factory.findMany({ orderBy: { id: 'asc' } })
  return Response.json(factories)
}
