import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { NavBar } from '@/components/NavBar'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmCadButton } from './ConfirmCadButton'
import { PickupButton } from './PickupButton'
import { ImagesSection } from './ImagesSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type Params = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/factory')

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
      createdBy: { select: { name: true } },
    },
  })

  if (!order) notFound()

  const isBoss = session.role === 'boss'

  return (
    <div className="min-h-screen">
      <NavBar userName={session.name} role={session.role} />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-12">
        {/* Back + header */}
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
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

        {/* Action buttons */}
        {order.status === 'CAD待确认' && (
          <ConfirmCadButton orderId={order.id} />
        )}
        {order.status === '已完成' && (
          <PickupButton orderId={order.id} />
        )}

        {/* Order info */}
        <div className="space-y-3">
          <Card className="shadow-none border-gray-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-gray-700">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoRow label="门店" value={order.store.name} />
                <InfoRow label="工厂" value={order.factory.name} />
                <InfoRow label="类别" value={order.category} />
                {order.size && <InfoRow label="尺寸" value={order.size} />}
                <InfoRow label="交货日期" value={order.deliveryDate} />
                <InfoRow label="开单人" value={order.createdBy.name} />
                <InfoRow label="电话" value={order.customerPhone} />
                {isBoss && order.laborFee != null && (
                  <InfoRow label="工费" value={`¥${order.laborFee}`} />
                )}
                {isBoss && order.goldPrice != null && (
                  <InfoRow label="当日金价" value={`¥${order.goldPrice}/g`} />
                )}
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
              <CardContent className="px-4 pb-4 space-y-2">
                {order.stones.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{s.stoneType} · {s.quantityWeight}</span>
                    {isBoss && s.unitPrice != null && (
                      <span className="text-gray-500">¥{s.unitPrice}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {order.materials.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">来料说明</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {order.materials.map((m) => (
                  <div key={m.id} className="text-sm text-gray-800">
                    {m.category} · {m.quantityWeight}{m.gemSize ? ` · ${m.gemSize}` : ''}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(order.styleNotes || order.remarks) && (
            <Card className="shadow-none border-gray-200">
              <CardContent className="px-4 py-3 space-y-2">
                {order.styleNotes && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">款式说明</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.styleNotes}</div>
                  </div>
                )}
                {order.remarks && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">备注</div>
                    <div className="text-sm text-gray-800">{order.remarks}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Images */}
          <ImagesSection
            orderId={order.id}
            initialImages={order.images}
            canUpload={!['已取件'].includes(order.status)}
          />

          {/* Settlement (boss only) */}
          {isBoss && order.settlement && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">出货结算</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {order.settlement.goldMaterial && (
                    <InfoRow label="出货金料" value={`${order.settlement.goldMaterial} ${order.settlement.goldWeight ?? ''}g`} />
                  )}
                  {order.settlement.actualLaborFee != null && (
                    <InfoRow label="实际工费" value={`¥${order.settlement.actualLaborFee}`} />
                  )}
                  {order.settlement.actualGoldWeight != null && (
                    <InfoRow label="实际金重" value={`${order.settlement.actualGoldWeight}g`} />
                  )}
                  {order.settlement.totalAmount != null && (
                    <InfoRow label="实付合计" value={`¥${order.settlement.totalAmount}`} highlight />
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {order.statusLogs.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">进度记录</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {order.statusLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5" />
                        <div className="w-px flex-1 bg-gray-200 mt-1" />
                      </div>
                      <div className="pb-2 flex-1">
                        <div className="font-medium text-gray-800">{log.toStatus}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {log.operator.name} · {format(new Date(log.createdAt), 'MM月dd日 HH:mm', { locale: zhCN })}
                        </div>
                        {log.note && <div className="text-xs text-gray-500 mt-0.5">{log.note}</div>}
                      </div>
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

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right ${highlight ? 'font-semibold text-amber-700' : 'text-gray-800'}`}>{value}</dd>
    </>
  )
}
