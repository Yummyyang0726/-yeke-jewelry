import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords, canReadRecycleRecords } from '@/lib/roles'
import { db, listStores, type RecycleRecordRow } from '@/lib/recycle-db'
import { Plus } from 'lucide-react'
import { RecycleList } from './RecycleList'

type Row = RecycleRecordRow & { storeShortName: string; storeName: string }

export default async function RecyclePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) redirect('/dashboard')

  // 店员直接进录入页，不展示列表（他们看不到自己以外的历史，也看不到自己的）
  if (!canReadRecycleRecords(session.role)) {
    redirect('/recycle/new')
  }

  const stores = listStores()
  const rows = db
    .prepare(
      `SELECT r.*, s.shortName AS storeShortName, s.name AS storeName
       FROM RecycleRecord r
       JOIN RecycleStore s ON s.id = r.storeId
       ORDER BY r.recordDate DESC, r.id DESC
       LIMIT 200`
    )
    .all() as Row[]

  const initial = rows.map((r) => ({
    id: r.id,
    recordNo: r.recordNo,
    recordDate: r.recordDate,
    storeShortName: r.storeShortName,
    storeName: r.storeName,
    customerName: r.customerName,
    idNumberMasked: `***${'*'.repeat(11)}${r.idNumberLast4}`,
    phone: r.phone,
    totalAmount: r.totalAmount,
    totalWeight: r.totalWeight,
    operatorName: r.operatorName,
    status: r.status,
    hasFront: !!r.idFrontPath,
    hasBack: !!r.idBackPath,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500">
          {initial.length} 条记录{initial.length === 200 ? '（仅显示最新 200 条）' : ''}
        </h2>
        <Link
          href="/recycle/new"
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" /> 新建
        </Link>
      </div>
      <RecycleList
        initial={initial}
        stores={stores.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
      />
    </div>
  )
}
