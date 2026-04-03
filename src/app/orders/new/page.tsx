import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { NavBar } from '@/components/NavBar'
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
    <div className="min-h-screen">
      <NavBar userName={session.name} role={session.role} />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-lg font-semibold text-gray-900">新建订单</h1>
        </div>
        <NewOrderForm
          stores={stores}
          factories={factories}
          isBoss={session.role === 'boss'}
        />
      </main>
    </div>
  )
}
