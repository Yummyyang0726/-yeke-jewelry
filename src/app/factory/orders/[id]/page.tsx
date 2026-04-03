import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { NavBar } from '@/components/NavBar'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import { AcceptOrderButton } from './AcceptOrderButton'
import { CadUploadSection } from './CadUploadSection'
import { SettlementForm } from './SettlementForm'

type Params = { params: Promise<{ id: string }> }

export default async function FactoryOrderDetailPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'factory') redirect('/dashboard')

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: {
      store: true,
      factory: true,
      stones: true,
      materials: true,
      images: { orderBy: { createdAt: 'asc' } },
      settlement: true,
      statusLogs: {
        include: { operator: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!order) notFound()
  if (order.factoryId !== session.factoryId) redirect('/factory')

  return (
    <div className="min-h-screen">
      <NavBar userName={session.name} role={session.role} />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/factory" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{order.customerName}</h1>
            <p className="text-xs text-gray-400">{order.orderNo}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Action area */}
        {order.status === '待接单' && <AcceptOrderButton orderId={order.id} />}
        {order.status === '待出图' && (
          <CadUploadSection
            orderId={order.id}
            initialCadImages={order.images.filter((i) => i.imageType === 'cad')}
          />
        )}
        {order.status === '生产中' && !order.settlement && <SettlementForm orderId={order.id} />}

        <div className="space-y-3">
          <Card className="shadow-none border-gray-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-gray-700">订单信息</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoRow label="来自门店" value={order.store.name} />
                <InfoRow label="类别" value={order.category} />
                {order.size && <InfoRow label="尺寸" value={order.size} />}
                <InfoRow label="交货日期" value={order.deliveryDate} />
              </dl>
            </CardContent>
          </Card>

          {order.materialDesc && (
            <Card className="shadow-none border-gray-200">
              <CardContent className="px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">定制用料</div>
                <div className="text-sm text-gray-800">{order.materialDesc}</div>
              </CardContent>
            </Card>
          )}

          {order.stones.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">定制用石</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {order.stones.map((s) => (
                  <div key={s.id} className="text-sm text-gray-800">{s.stoneType} · {s.quantityWeight}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {order.materials.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">来料说明</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1.5">
                {order.materials.map((m) => (
                  <div key={m.id} className="text-sm text-gray-800">
                    {m.category} · {m.quantityWeight}{m.gemSize ? ` · ${m.gemSize}` : ''}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {order.styleNotes && (
            <Card className="shadow-none border-gray-200">
              <CardContent className="px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">款式说明</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.styleNotes}</div>
              </CardContent>
            </Card>
          )}

          {/* Settlement summary if done */}
          {order.settlement && (
            <Card className="shadow-none border-gray-200 border-green-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-green-700">已提交结算</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {order.settlement.actualGoldWeight != null && (
                    <InfoRow label="实际金重" value={`${order.settlement.actualGoldWeight}g`} />
                  )}
                  {order.settlement.actualLaborFee != null && (
                    <InfoRow label="实际工费" value={`¥${order.settlement.actualLaborFee}`} />
                  )}
                  {order.settlement.totalAmount != null && (
                    <InfoRow label="实付合计" value={`¥${order.settlement.totalAmount}`} />
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {order.statusLogs.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">进度记录</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {order.statusLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{log.toStatus}</span>
                      <span>·</span>
                      <span>{log.operator.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-800">{value}</dd>
    </>
  )
}
