import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [
    orderCount,
    ordersByStatus,
    ordersByFactory,
    noteCount,
    unpaidNoteCount,
    totalUnpaidFee,
    receiptCount,
    settlementCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.order.groupBy({ by: ['factoryId'], _count: true, orderBy: { _count: { factoryId: 'desc' } }, take: 5 }),
    prisma.deliveryNote.count(),
    prisma.deliveryNote.count({ where: { paymentStatus: '未付' } }),
    prisma.deliveryNote.aggregate({ where: { paymentStatus: '未付' }, _sum: { totalFee: true } }),
    prisma.refineryReceipt.count(),
    prisma.settlement.count(),
  ])

  const factories = await prisma.factory.findMany()
  const factoryMap = new Map(factories.map((f) => [f.id, f.name]))

  const statusMap = Object.fromEntries(ordersByStatus.map((s) => [s.status, s._count]))

  const topFactories = ordersByFactory.map((f) => ({
    name: factoryMap.get(f.factoryId) ?? '未知',
    count: f._count,
  }))

  return (
    <AppShell userName={session.name} role={session.role} title="数据报表">
      {/* Order stats */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">订单概览</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="总订单" value={orderCount} color="text-foreground bg-secondary" />
          <StatCard label="生产中" value={statusMap['生产中'] ?? 0} color="text-sky-600 bg-sky-50" />
          <StatCard label="已完成" value={(statusMap['已完成'] ?? 0) + (statusMap['已取件'] ?? 0)} color="text-emerald-600 bg-emerald-50" />
        </div>
      </div>

      {/* Order by status breakdown */}
      <Card className="mb-5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">订单状态分布</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {['待接单', '待出图', 'CAD待确认', '生产中', '已完成', '已取件'].map((status) => {
              const count = statusMap[status] ?? 0
              const pct = orderCount > 0 ? (count / orderCount) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20">{status}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="bg-primary/60 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top factories */}
      {topFactories.length > 0 && (
        <Card className="mb-5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">工厂订单排名</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {topFactories.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">{i + 1}</span>
                    <span className="text-sm text-foreground">{f.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{f.count} 单</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation stats */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">对账概览</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="出库单" value={noteCount} color="text-violet-600 bg-violet-50" />
          <StatCard label="收料单" value={receiptCount} color="text-emerald-600 bg-emerald-50" />
          <StatCard label="已结算" value={settlementCount} color="text-sky-600 bg-sky-50" />
        </div>
      </div>

      {/* Unpaid summary */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">未付工费</div>
              <div className="text-xs text-muted-foreground">{unpaidNoteCount} 笔待付款</div>
            </div>
            <div className="text-xl font-bold text-rose-600">
              ¥{(totalUnpaidFee._sum.totalFee ?? 0).toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-75">{label}</div>
    </div>
  )
}
