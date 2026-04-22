import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { UserList } from './UserList'

export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'boss') redirect('/settings')

  const [users, factories] = await Promise.all([
    prisma.user.findMany({
      include: { factory: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.factory.findMany({ orderBy: { id: 'asc' } }),
  ])

  const usersData = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    factoryId: u.factoryId,
    factoryName: u.factory?.name ?? null,
  }))

  return (
    <AppShell userName={session.name} role={session.role} title="用户管理" hideBottomTabs>
      <UserList
        initialUsers={usersData}
        factories={factories.map((f) => ({ id: f.id, name: f.name }))}
        currentUserId={session.userId}
      />
    </AppShell>
  )
}
