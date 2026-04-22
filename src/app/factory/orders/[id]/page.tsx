import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
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

  const deliveryItems = order.orderNo
    ? await prisma.deliveryItem.findMany({
        where: {
          internalNumber: order.orderNo,
          deliveryNote: { factoryId: session.factoryId! },
        },
        include: {
          deliveryNote: {
            select: {
              id: true,
              noteDate: true,
              factoryNoteNumber: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      })
    : []

  return (
    <AppShell userName={session.name} role={session.role} hideBottomTabs>
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
                <InfoRow label="开单日期" value={order.orderDate} />
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

          {/* Delivery note / 对账 info */}
          {deliveryItems.length > 0 && (
            <Card className="shadow-none border-gray-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">出库对账</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {deliveryItems.map((it) => {
                  const fee = it.feePerGram * it.goldWeight + it.feePerPiece * it.quantity
                  return (
                    <div key={it.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{it.deliveryNote.noteDate}</span>
                          {it.deliveryNote.factoryNoteNumber && (
                            <span className="text-xs text-muted-foreground">厂单号 {it.deliveryNote.factoryNoteNumber}</span>
                          )}
                        </div>
                        <PaymentBadge status={it.deliveryNote.paymentStatus} />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          <span className="inline-block px-1.5 py-0.5 mr-1 bg-amber-50 text-amber-700 rounded font-medium">
                            {it.materialType || '18K'}
                          </span>
                          金重 {it.goldWeight.toFixed(2)}g
                        </span>
                        {fee > 0 && <span>工费 ¥{fee.toFixed(2)}</span>}
                        <span>件数 {it.quantity}</span>
                      </div>
                    </div>
                  )
                })}
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
    </AppShell>
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

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    '未付': 'bg-red-50 text-red-600',
    '部分付': 'bg-amber-50 text-amber-600',
    '已付': 'bg-green-50 text-green-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
