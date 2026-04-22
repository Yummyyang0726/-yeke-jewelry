import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { ReceiptForm } from './ReceiptForm'

export default async function NewReceiptPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/reconciliation')

  const factories = await prisma.factory.findMany({ orderBy: { id: 'asc' } })

  return (
    <AppShell userName={session.name} role={session.role} title="新建收料单" hideBottomTabs>
      <ReceiptForm factories={factories.map((f) => ({ id: f.id, name: f.name }))} />
    </AppShell>
  )
}
