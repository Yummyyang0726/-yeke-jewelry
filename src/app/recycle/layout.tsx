import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'

export default async function RecycleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canCreateRecycleRecords(session.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto flex items-center h-12 px-2">
          <Link href="/dashboard" className="p-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-medium text-gray-900">旧金回购登记</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto w-full px-4 py-4 pb-24">{children}</main>
    </div>
  )
}
