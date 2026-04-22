import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { FactoryList } from './FactoryList'

export default async function FactoriesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const factories = await prisma.factory.findMany({ orderBy: { id: 'asc' } })
  const isBoss = session.role === 'boss'

  return (
    <AppShell userName={session.name} role={session.role} title="工厂管理" hideBottomTabs>
      <FactoryList
        initialFactories={factories.map((f) => ({ id: f.id, name: f.name, noteTemplate: f.noteTemplate }))}
        canEdit={isBoss}
      />
    </AppShell>
  )
}
