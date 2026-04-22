import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { listStores } from '@/lib/recycle-db'
import { NewRecycleForm } from './NewRecycleForm'

export default async function NewRecyclePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) redirect('/dashboard')
  const stores = listStores()
  return (
    <NewRecycleForm
      stores={stores.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
    />
  )
}
