import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

export default async function FactoryDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'factory') redirect('/dashboard')

  const orders = await prisma.order.findMany({
    where: { factoryId: session.factoryId! },
    include: {
      store: { select: { shortName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pending = orders.filter((o) => ['待接单', '待出图'].includes(o.status))
  const inProgress = orders.filter((o) => ['CAD待确认', '生产中'].includes(o.status))
  const done = orders.filter((o) => ['已完成', '已取件'].includes(o.status))

  const factory = await prisma.factory.findUnique({ where: { id: session.factoryId! } })

  return (
    <AppShell userName={session.name} role={session.role} title={factory?.name ?? '叶客金匠'}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="待处理" count={pending.length} color="text-orange-600 bg-orange-50" />
        <StatCard label="生产中" count={inProgress.length} color="text-sky-600 bg-sky-50" />
        <StatCard label="已交付" count={done.length} color="text-emerald-600 bg-emerald-50" />
      </div>

      {/* Sections */}
      <OrderSection title="待处理" orders={pending} />
      <OrderSection title="进行中" orders={inProgress} />
      <OrderSection title="已完成" orders={done} />
    </AppShell>
  )
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs mt-0.5 opacity-75">{label}</div>
    </div>
  )
}

type Order = {
  id: number
  orderNo: string
  customerName: string
  category: string
  orderDate: string
  status: string
  store: { shortName: string }
}

function OrderSection({ title, orders }: { title: string; orders: Order[] }) {
  if (orders.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link key={order.id} href={`/factory/orders/${order.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{order.customerName}</span>
                      <span className="text-xs text-muted-foreground">{order.orderNo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{order.category}</span>
                      <span>{order.store.shortName}</span>
                      <span>·</span>
                      <span>开单 {order.orderDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={order.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
