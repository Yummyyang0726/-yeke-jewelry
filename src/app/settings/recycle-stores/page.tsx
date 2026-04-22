import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { listStores } from '@/lib/recycle-db'
import { RecycleStoreList } from './RecycleStoreList'

export default async function RecycleStoresPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'boss') redirect('/dashboard')

  const stores = listStores()

  return (
    <AppShell userName={session.name} role={session.role} title="回购门店" hideBottomTabs>
      <p className="text-xs text-gray-500 mb-3">
        用于旧金回购登记单编号 <span className="font-mono">YK-{'{'}简称{'}'}-YY-NNNN</span> 的门店台账。独立于订单门店。
      </p>
      <RecycleStoreList
        initial={stores.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          address: s.address,
          phone: s.phone,
        }))}
      />
    </AppShell>
  )
}
