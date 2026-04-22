import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db, listStores } from '@/lib/recycle-db'
import { canCreateRecycleRecords } from '@/lib/roles'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }
  return Response.json({ stores: listStores() })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'boss') {
    return Response.json({ error: '仅老板可管理门店' }, { status: 403 })
  }
  const body = await req.json()
  const name = (body.name ?? '').trim()
  const shortName = (body.shortName ?? '').trim()
  const address = (body.address ?? '').trim()
  const phone = (body.phone ?? '').trim()
  if (!name || !shortName) {
    return Response.json({ error: '门店名称和简称必填' }, { status: 400 })
  }
  if (!/^[A-Za-z0-9\u4e00-\u9fa5]{1,8}$/.test(shortName)) {
    return Response.json({ error: '简称只能包含 1-8 位中英文数字' }, { status: 400 })
  }
  const res = db
    .prepare(
      `INSERT INTO RecycleStore (name, shortName, address, phone) VALUES (?, ?, ?, ?)`
    )
    .run(name, shortName, address, phone)
  return Response.json({ id: res.lastInsertRowid, name, shortName, address, phone }, { status: 201 })
}
