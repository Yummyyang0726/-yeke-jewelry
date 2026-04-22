import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const stores = await prisma.store.findMany({ orderBy: { id: 'asc' } })
  return Response.json(stores)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'boss') {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { name, shortName, address, phone } = body

  if (!name?.trim() || !shortName?.trim()) {
    return Response.json({ error: '请填写门店名称和简称' }, { status: 400 })
  }

  const store = await prisma.store.create({
    data: {
      name: name.trim(),
      shortName: shortName.trim(),
      address: address?.trim() ?? '',
      phone: phone?.trim() ?? '',
    },
  })

  return Response.json(store, { status: 201 })
}
