import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { getRecord, getStore, listItemsForRecord } from '@/lib/recycle-db'
import { ReceiptPrinter } from './ReceiptPrinter'

type Params = { params: Promise<{ id: string }> }

/**
 * 客户联 - 打印用。店员提交完成后跳到此页并自动触发打印。
 * 只允许经办人或老板访问，避免打印页被别人拉取。
 */
export default async function ReceiptPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) redirect('/dashboard')

  const { id } = await params
  const record = getRecord(Number(id))
  if (!record) notFound()
  const isOwner = record.operatorUserId === session.userId
  const isBoss = session.role === 'boss'
  if (!isOwner && !isBoss) redirect('/dashboard')

  const store = getStore(record.storeId)
  const items = listItemsForRecord(record.id)

  return (
    <ReceiptPrinter
      record={{
        recordNo: record.recordNo,
        recordDate: record.recordDate,
        customerName: record.customerName,
        idNumberMasked: `***${'*'.repeat(11)}${record.idNumberLast4}`,
        phone: record.phone,
        remarks: record.remarks,
        totalAmount: record.totalAmount,
        totalWeight: record.totalWeight,
        operatorName: record.operatorName,
        createdAt: record.createdAt,
      }}
      store={store ? { name: store.name, shortName: store.shortName, phone: store.phone, address: store.address } : null}
      items={items.map((i) => ({
        id: i.id,
        material: i.material ?? '',
        purity: i.purity,
        weightG: i.weightG,
        unitPrice: i.unitPrice,
        amount: i.amount,
      }))}
    />
  )
}
