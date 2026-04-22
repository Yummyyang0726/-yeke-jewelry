import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { SearchBar } from '@/components/SearchBar'
import { Plus, ChevronRight } from 'lucide-react'

const STATUSES = ['待接单', '待出图', 'CAD待确认', '生产中', '已完成', '已取件']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; storeId?: string; q?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/factory')

  const { status, storeId, q } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status) where.status = status
  if (storeId) where.storeId = parseInt(storeId)
  if (q?.trim()) {
    where.OR = [
      { customerName: { contains: q.trim() } },
      { orderNo: { contains: q.trim() } },
      { customerPhone: { contains: q.trim() } },
      { category: { contains: q.trim() } },
    ]
  }

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
    <AppShell userName={session.name} role={session.role}>
      {/* Search */}
      <SearchBar />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '待处理', statuses: ['待接单', '待出图'], color: 'text-orange-600 bg-orange-50' },
          { label: 'CAD待确认', statuses: ['CAD待确认'], color: 'text-violet-600 bg-violet-50' },
          { label: '生产中', statuses: ['生产中'], color: 'text-sky-600 bg-sky-50' },
        ].map(({ label, statuses: ss, color }) => {
          const n = ss.reduce((a, s) => a + (countMap[s] ?? 0), 0)
          return (
            <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
              <div className="text-2xl font-bold">{n}</div>
              <div className="text-xs mt-0.5 opacity-75">{label}</div>
            </div>
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
          <div className="text-center text-muted-foreground py-12">暂无订单</div>
        )}
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{order.customerName}</span>
                      <span className="text-xs text-muted-foreground">{order.orderNo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{order.category}</span>
                      <span>{order.store.shortName}</span>
                      <span>·</span>
                      <span>{order.factory.name}</span>
                      <span>·</span>
                      <span>开单 {order.orderDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={order.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* FAB */}
      <Link
        href="/orders/new"
        className="fixed bottom-20 right-5 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </Link>
    </AppShell>
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
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-border text-muted-foreground bg-white hover:border-primary/30'
        }`}
    >
      {label}
    </Link>
  )
}
