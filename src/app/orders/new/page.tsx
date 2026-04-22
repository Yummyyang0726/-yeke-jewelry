import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { NewOrderForm } from './NewOrderForm'

export default async function NewOrderPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/factory')

  const [stores, factories] = await Promise.all([
    prisma.store.findMany({ orderBy: { id: 'asc' } }),
    prisma.factory.findMany({ orderBy: { id: 'asc' } }),
  ])

  return (
    <AppShell userName={session.name} role={session.role} title="新建订单" hideBottomTabs>
      <NewOrderForm
        stores={stores}
        factories={factories}
        isBoss={session.role === 'boss'}
      />
    </AppShell>
  )
}
