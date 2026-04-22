import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const factories = await prisma.factory.findMany({ orderBy: { id: 'asc' } })
  return Response.json(factories)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { name } = body
  if (!name?.trim()) {
    return Response.json({ error: '请填写工厂名称' }, { status: 400 })
  }

  const factory = await prisma.factory.create({
    data: { name: name.trim() },
  })

  return Response.json(factory, { status: 201 })
}
