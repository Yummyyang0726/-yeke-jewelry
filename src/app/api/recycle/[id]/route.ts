import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { getRecord, getStore, listItemsForRecord } from '@/lib/recycle-db'
import { canDecryptRecycleId, canReadRecycleRecords } from '@/lib/roles'
import { safeDecryptField, maskIdNumber } from '@/lib/encryption'
import { getSignedUrl } from '@/lib/cos'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const rid = Number(id)
  const record = getRecord(rid)
  if (!record) return Response.json({ error: '记录不存在' }, { status: 404 })
  const store = getStore(record.storeId)
  const items = listItemsForRecord(rid)

  let idNumberPlain: string | null = null
  if (canDecryptRecycleId(session.role)) {
    const r = safeDecryptField(record.idNumberEncrypted)
    if (r.ok) idNumberPlain = r.value
  }

  function sign(path: string | null): string | null {
    if (!path) return null
    try {
      return getSignedUrl(path, 300)
    } catch {
      return null
    }
  }

  return Response.json({
    id: record.id,
    recordNo: record.recordNo,
    recordDate: record.recordDate,
    store: store ? { id: store.id, name: store.name, shortName: store.shortName } : null,
    customerName: record.customerName,
    idNumber: idNumberPlain,
    idNumberMasked: idNumberPlain
      ? maskIdNumber(idNumberPlain)
      : `***${'*'.repeat(11)}${record.idNumberLast4}`,
    phone: record.phone,
    isMinor: !!record.isMinor,
    remarks: record.remarks,
    totalAmount: record.totalAmount,
    totalWeight: record.totalWeight,
    status: record.status,
    operatorName: record.operatorName,
    createdAt: record.createdAt,
    items,
    photos: {
      front: sign(record.idFrontPath),
      back: sign(record.idBackPath),
      signature: sign(record.signaturePath),
    },
  })
}
