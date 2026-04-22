import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import { ReceiptActions } from './ReceiptActions'

type Params = { params: Promise<{ id: string }> }

export default async function ReceiptDetailPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/reconciliation')

  const { id } = await params
  const receipt = await prisma.refineryReceipt.findUnique({
    where: { id: parseInt(id) },
    include: {
      factory: { select: { name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!receipt) notFound()

  return (
    <AppShell userName={session.name} role={session.role} hideBottomTabs>
      {/* Back + header */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/reconciliation/receipts" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground leading-tight">
            {receipt.refineryName || '收料单详情'}
          </h1>
          <p className="text-xs text-muted-foreground">{receipt.receiptNumber || receipt.receiptDate}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Basic info */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-gray-700">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="收料日期" value={receipt.receiptDate} />
              {receipt.receiptNumber && <InfoRow label="单号" value={receipt.receiptNumber} />}
              {receipt.refineryName && <InfoRow label="精炼厂" value={receipt.refineryName} />}
              {receipt.factory && <InfoRow label="关联工厂" value={receipt.factory.name} />}
              {receipt.trackingNumber && <InfoRow label="快递单号" value={receipt.trackingNumber} />}
              {receipt.shippedDate && <InfoRow label="寄出日期" value={receipt.shippedDate} />}
              {receipt.shippedWeight > 0 && <InfoRow label="寄出重量" value={`${receipt.shippedWeight.toFixed(2)}g`} />}
            </dl>
          </CardContent>
        </Card>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-sky-50 p-3 text-center">
            <div className="text-base font-bold text-sky-700">{receipt.totalIncoming.toFixed(2)}g</div>
            <div className="text-xs text-sky-600/70">来料总重</div>
          </div>
          <div className="rounded-xl bg-violet-50 p-3 text-center">
            <div className="text-base font-bold text-violet-700">{receipt.totalPostMelt.toFixed(2)}g</div>
            <div className="text-xs text-violet-600/70">熔后总重</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <div className="text-base font-bold text-emerald-700">{receipt.totalConverted.toFixed(2)}g</div>
            <div className="text-xs text-emerald-600/70">折足总重</div>
          </div>
        </div>

        {/* Items table */}
        {receipt.items.length > 0 && (
          <Card className="shadow-none border-gray-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-gray-700">收料明细 ({receipt.items.length} 项)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {receipt.items.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {item.materialName || '未命名'}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        折足 {item.convertedWeight.toFixed(2)}g
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>来料: {item.incomingWeight.toFixed(2)}g</span>
                      <span>熔后: {item.postMeltWeight.toFixed(2)}g</span>
                      <span>折算率: {item.conversionRate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <ReceiptActions receiptId={receipt.id} />
      </div>
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </>
  )
}
