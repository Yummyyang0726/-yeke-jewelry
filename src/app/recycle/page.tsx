import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords, canReadRecycleRecords } from '@/lib/roles'
import { db, listStores, type RecycleRecordRow } from '@/lib/recycle-db'
import { Plus, Clock } from 'lucide-react'
import { RecycleList } from './RecycleList'

type Row = RecycleRecordRow & { storeShortName: string; storeName: string }

export default async function RecyclePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) redirect('/dashboard')

  const isBoss = canReadRecycleRecords(session.role)

  // ─── Drafts (客户自助待处理) ────────────────────────────────────────────────
  const drafts = db
    .prepare(
      `SELECT r.*, s.shortName AS storeShortName, s.name AS storeName
       FROM RecycleRecord r
       JOIN RecycleStore s ON s.id = r.storeId
       WHERE r.status = 'draft'
       ORDER BY r.createdAt DESC
       LIMIT 50`
    )
    .all() as Row[]

  // ─── Completed records (boss only) ─────────────────────────────────────────
  const stores = listStores()
  const completed = isBoss
    ? (db
        .prepare(
          `SELECT r.*, s.shortName AS storeShortName, s.name AS storeName
           FROM RecycleRecord r
           JOIN RecycleStore s ON s.id = r.storeId
           WHERE r.status = 'completed'
           ORDER BY r.recordDate DESC, r.id DESC
           LIMIT 200`
        )
        .all() as Row[])
    : []

  const toRow = (r: Row) => ({
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
  })

  const initial = completed.map(toRow)

  return (
    <div>
      {/* ── 待处理草稿分区 ──────────────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-medium text-gray-900">待处理</h2>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {drafts.length}
            </span>
          </div>
          <ul className="space-y-2">
            {drafts.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/recycle/${r.id}/complete`}
                  className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 hover:border-amber-300 hover:bg-amber-100"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {r.customerName}
                    </span>
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-200 text-amber-900 font-medium">
                      待补填
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {r.storeName} · {r.phone} · 客户自助提交
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {isBoss && <hr className="mt-4 border-gray-200" />}
        </div>
      )}

      {/* ── 主操作栏 ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        {isBoss ? (
          <h2 className="text-sm font-medium text-gray-500">
            {initial.length} 条记录
            {initial.length === 200 ? '（仅显示最新 200 条）' : ''}
          </h2>
        ) : (
          <h2 className="text-sm font-medium text-gray-500">旧金回购登记</h2>
        )}
        <Link
          href="/recycle/new"
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" /> 新建
        </Link>
      </div>

      {/* ── 已完成列表（仅老板可见） ─────────────────────────────────────────── */}
      {isBoss && (
        <RecycleList
          initial={initial}
          stores={stores.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
        />
      )}
    </div>
  )
}
