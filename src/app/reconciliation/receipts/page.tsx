import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

export default async function ReceiptsListPage({
  searchParams,
}: {
  searchParams: Promise<{ factoryId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'factory') redirect('/reconciliation')

  const { factoryId } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (factoryId) where.factoryId = parseInt(factoryId)

  const [receipts, factories] = await Promise.all([
    prisma.refineryReceipt.findMany({
      where,
      include: {
        factory: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ receiptDate: 'desc' }, { id: 'desc' }],
      take: 100,
    }),
    prisma.factory.findMany({ orderBy: { id: 'asc' } }),
  ])

  return (
    <AppShell userName={session.name} role={session.role} title="收料单列表" hideBottomTabs>
      {/* Back */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/reconciliation" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">收料单列表</h1>
      </div>

      {/* Factory filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip href="/reconciliation/receipts" active={!factoryId} label="全部工厂" />
        {factories.map((f) => (
          <FilterChip
            key={f.id}
            href={`/reconciliation/receipts?factoryId=${f.id}`}
            active={factoryId === String(f.id)}
            label={f.name}
          />
        ))}
      </div>

      {/* Receipts list */}
      <div className="space-y-2.5">
        {receipts.length === 0 && (
          <div className="text-center text-muted-foreground py-12">暂无收料单</div>
        )}
        {receipts.map((receipt) => (
          <Link key={receipt.id} href={`/reconciliation/receipts/${receipt.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] mb-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {receipt.refineryName || '未命名'}
                      </span>
                      {receipt.receiptNumber && (
                        <span className="text-xs text-muted-foreground">{receipt.receiptNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      <span>{receipt.receiptDate}</span>
                      {receipt.factory && (
                        <>
                          <span>·</span>
                          <span>{receipt.factory.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>来料 {receipt.totalIncoming.toFixed(2)}g</span>
                      <span>·</span>
                      <span>折足 {receipt.totalConverted.toFixed(2)}g</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* FAB */}
      <Link
        href="/reconciliation/receipts/new"
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
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors
        ${active
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-border text-muted-foreground bg-white hover:border-primary/30'
        }`}
    >
      {label}
    </Link>
  )
}
