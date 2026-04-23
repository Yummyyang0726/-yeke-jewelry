import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { getRecord, getStore, listStores } from '@/lib/recycle-db'
import { CompleteRecycleForm } from './CompleteRecycleForm'

type Params = { params: Promise<{ id: string }> }

export default async function CompleteRecordPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) redirect('/dashboard')

  const { id } = await params
  const record = getRecord(Number(id))
  if (!record) notFound()
  if (record.status !== 'draft') redirect(`/recycle/${id}`)

  const store = getStore(record.storeId)
  const stores = listStores()

  return (
    <CompleteRecycleForm
      recordId={record.id}
      customerName={record.customerName}
      phone={record.phone}
      idNumberMasked={`***${'*'.repeat(11)}${record.idNumberLast4}`}
      hasFront={!!record.idFrontPath}
      defaultStoreId={record.storeId}
      defaultStoreShortName={store?.shortName ?? ''}
      stores={stores.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
    />
  )
}
