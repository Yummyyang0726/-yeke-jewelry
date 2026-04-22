import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { NoteForm } from './NoteForm'

export default async function NewNotePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/reconciliation/notes')

  const factories = await prisma.factory.findMany({ orderBy: { id: 'asc' } })

  return (
    <AppShell userName={session.name} role={session.role} title="新建出库单" hideBottomTabs>
      <NoteForm factories={factories.map((f) => ({ id: f.id, name: f.name, noteTemplate: f.noteTemplate }))} />
    </AppShell>
  )
}
