import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { StoreList } from './StoreList'

export default async function StoresPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const stores = await prisma.store.findMany({ orderBy: { id: 'asc' } })
  const isBoss = session.role === 'boss'

  return (
    <AppShell userName={session.name} role={session.role} title="门店管理" hideBottomTabs>
      <StoreList
        initialStores={stores.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          address: s.address,
          phone: s.phone,
        }))}
        canEdit={isBoss}
      />
    </AppShell>
  )
}
