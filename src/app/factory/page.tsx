import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { NavBar } from '@/components/NavBar'
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
    <div className="min-h-screen">
      <NavBar userName={session.name} role={session.role} />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
        <div className="mb-4">
          <h1 className="font-semibold text-gray-900">{factory?.name}</h1>
          <p className="text-xs text-gray-400">我的订单</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard label="待处理" count={pending.length} color="text-orange-600" />
          <StatCard label="生产中" count={inProgress.length} color="text-cyan-600" />
          <StatCard label="已交付" count={done.length} color="text-green-600" />
        </div>

        {/* Sections */}
        <OrderSection title="待处理" orders={pending} />
        <OrderSection title="进行中" orders={inProgress} />
        <OrderSection title="已完成" orders={done} />
      </main>
    </div>
  )
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Card className="shadow-none border-gray-200">
      <CardContent className="p-3 text-center">
        <div className={`text-2xl font-bold ${color}`}>{count}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}

type Order = {
  id: number
  orderNo: string
  customerName: string
  category: string
  deliveryDate: string
  status: string
  store: { shortName: string }
}

function OrderSection({ title, orders }: { title: string; orders: Order[] }) {
  if (orders.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link key={order.id} href={`/factory/orders/${order.id}`}>
            <Card className="shadow-none border-gray-200 hover:border-amber-300 hover:shadow-sm transition-all active:scale-[0.99]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{order.customerName}</span>
                      <span className="text-xs text-gray-400">{order.orderNo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{order.category}</span>
                      <span>{order.store.shortName}</span>
                      <span>·</span>
                      <span>交期 {order.deliveryDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={order.status} />
                    <ChevronRight className="w-4 h-4 text-gray-300" />
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
