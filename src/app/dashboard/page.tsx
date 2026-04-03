import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { NavBar } from '@/components/NavBar'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ChevronRight } from 'lucide-react'

const STATUSES = ['待接单', '待出图', 'CAD待确认', '生产中', '已完成', '已取件']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; storeId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/factory')

  const { status, storeId } = await searchParams

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (storeId) where.storeId = parseInt(storeId)

  const [orders, stores, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        store: { select: { shortName: true } },
        factory: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.store.findMany({ orderBy: { id: 'asc' } }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
  ])

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]))

  return (
    <div className="min-h-screen">
      <NavBar userName={session.name} role={session.role} />

      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '待处理', statuses: ['待接单', '待出图'], color: 'text-orange-600' },
            { label: 'CAD待确认', statuses: ['CAD待确认'], color: 'text-purple-600' },
            { label: '生产中', statuses: ['生产中'], color: 'text-cyan-600' },
          ].map(({ label, statuses: ss, color }) => {
            const n = ss.reduce((a, s) => a + (countMap[s] ?? 0), 0)
            return (
              <Card key={label} className="shadow-none border-gray-200">
                <CardContent className="p-3 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{n}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <FilterChip href="/dashboard" active={!status} label="全部" />
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              href={`/dashboard?status=${encodeURIComponent(s)}`}
              active={status === s}
              label={s}
            />
          ))}
        </div>

        {/* Store filter */}
        {stores.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <FilterChip href={status ? `/dashboard?status=${status}` : '/dashboard'} active={!storeId} label="所有门店" small />
            {stores.map((s) => (
              <FilterChip
                key={s.id}
                href={`/dashboard?${status ? `status=${status}&` : ''}storeId=${s.id}`}
                active={storeId === String(s.id)}
                label={s.shortName}
                small
              />
            ))}
          </div>
        )}

        {/* Order list */}
        <div className="space-y-2.5">
          {orders.length === 0 && (
            <div className="text-center text-gray-400 py-12">暂无订单</div>
          )}
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="shadow-none border-gray-200 hover:border-amber-300 hover:shadow-sm transition-all active:scale-[0.99]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{order.customerName}</span>
                        <span className="text-xs text-gray-400">{order.orderNo}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{order.category}</span>
                        <span>{order.store.shortName}</span>
                        <span>·</span>
                        <span>{order.factory.name}</span>
                        <span>·</span>
                        <span>交期 {order.deliveryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={order.status} />
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      {/* FAB */}
      <Link
        href="/orders/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-700 rounded-full flex items-center justify-center shadow-lg hover:bg-amber-800 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6 text-white" />
      </Link>
    </div>
  )
}

function FilterChip({
  href,
  active,
  label,
  small,
}: {
  href: string
  active: boolean
  label: string
  small?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors
        ${small ? 'py-0.5' : ''}
        ${active
          ? 'bg-amber-700 border-amber-700 text-white'
          : 'border-gray-200 text-gray-600 bg-white hover:border-amber-300'
        }`}
    >
      {label}
    </Link>
  )
}
