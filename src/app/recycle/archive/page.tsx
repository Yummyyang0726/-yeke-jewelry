import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canReadRecycleRecords } from '@/lib/roles'
import { db, listStores, type RecycleRecordRow, type RecycleItemRow } from '@/lib/recycle-db'
import { ArchivePrinter } from './ArchivePrinter'

type SearchParams = Promise<{ year?: string; month?: string; storeId?: string }>

/**
 * 月度归档导出页 - 仅老板。
 * 默认显示上个月；可切换年月和门店。
 * 页面自身是打印友好的 A4 版式，浏览器 "打印 → 另存为 PDF" 或直接激光打印归档。
 */
export default async function RecycleArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canReadRecycleRecords(session.role)) redirect('/dashboard')

  const sp = await searchParams

  // 默认上个月
  const now = new Date()
  const defaultDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = Number(sp.year) || defaultDate.getFullYear()
  const month = Number(sp.month) || defaultDate.getMonth() + 1
  const storeId = sp.storeId ? Number(sp.storeId) : null

  const monthStr = String(month).padStart(2, '0')
  const from = `${year}-${monthStr}-01`
  // 下个月第一天，用 < 判断
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const stores = listStores()

  const where: string[] = ['r.recordDate >= ?', 'r.recordDate < ?']
  const args: (string | number)[] = [from, nextMonth]
  if (storeId) {
    where.push('r.storeId = ?')
    args.push(storeId)
  }

  const records = db
    .prepare(
      `SELECT r.*, s.shortName AS storeShortName, s.name AS storeName
       FROM RecycleRecord r
       JOIN RecycleStore s ON s.id = r.storeId
       WHERE ${where.join(' AND ')}
       ORDER BY r.storeId ASC, r.recordDate ASC, r.id ASC`
    )
    .all(...args) as (RecycleRecordRow & { storeShortName: string; storeName: string })[]

  // 批量取 items
  const recordIds = records.map((r) => r.id)
  const itemsMap = new Map<number, RecycleItemRow[]>()
  if (recordIds.length > 0) {
    const placeholders = recordIds.map(() => '?').join(',')
    const allItems = db
      .prepare(`SELECT * FROM RecycleItem WHERE recordId IN (${placeholders}) ORDER BY sortOrder ASC, id ASC`)
      .all(...recordIds) as RecycleItemRow[]
    for (const it of allItems) {
      const list = itemsMap.get(it.recordId) ?? []
      list.push(it)
      itemsMap.set(it.recordId, list)
    }
  }

  const rows = records.map((r) => ({
    id: r.id,
    recordNo: r.recordNo,
    recordDate: r.recordDate,
    storeShortName: r.storeShortName,
    storeName: r.storeName,
    customerName: r.customerName,
    idNumberMasked: `***${'*'.repeat(11)}${r.idNumberLast4}`,
    phone: r.phone,
    totalWeight: r.totalWeight,
    totalAmount: r.totalAmount,
    operatorName: r.operatorName,
    items: itemsMap.get(r.id) ?? [],
  }))

  const totalWeight = rows.reduce((s, r) => s + r.totalWeight, 0)
  const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0)
  const selectedStore = storeId ? stores.find((s) => s.id === storeId) ?? null : null

  return (
    <ArchivePrinter
      year={year}
      month={month}
      storeId={storeId}
      storeLabel={selectedStore ? `${selectedStore.name}（${selectedStore.shortName}）` : '全部门店'}
      stores={stores.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
      rows={rows}
      totalWeight={totalWeight}
      totalAmount={totalAmount}
      generatedAt={new Date().toLocaleString('zh-CN', { hour12: false })}
      generatedBy={session.name}
    />
  )
}
