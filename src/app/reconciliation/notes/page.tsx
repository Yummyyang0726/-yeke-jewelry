import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

const PAYMENT_STATUSES = ['全部', '未付', '部分付', '已付']

export default async function NotesListPage({
  searchParams,
}: {
  searchParams: Promise<{ factoryId?: string; paymentStatus?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isFactory = session.role === 'factory'

  const { factoryId, paymentStatus } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (isFactory) {
    where.factoryId = session.factoryId
  } else if (factoryId) {
    where.factoryId = parseInt(factoryId)
  }
  if (paymentStatus && paymentStatus !== '全部') where.paymentStatus = paymentStatus

  const [notes, factories] = await Promise.all([
    prisma.deliveryNote.findMany({
      where,
      include: {
        factory: { select: { name: true } },
        items: { select: { internalNumber: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ noteDate: 'desc' }, { id: 'desc' }],
      take: 100,
    }),
    isFactory
      ? Promise.resolve([])
      : prisma.factory.findMany({ orderBy: { id: 'asc' } }),
  ])

  return (
    <AppShell userName={session.name} role={session.role} title="出库单列表" hideBottomTabs>
      {/* Back */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/reconciliation" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">出库单列表</h1>
      </div>

      {/* Factory filter chips */}
      {!isFactory && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <FilterChip
            href={paymentStatus ? `/reconciliation/notes?paymentStatus=${paymentStatus}` : '/reconciliation/notes'}
            active={!factoryId}
            label="全部工厂"
          />
          {factories.map((f) => (
            <FilterChip
              key={f.id}
              href={`/reconciliation/notes?factoryId=${f.id}${paymentStatus ? `&paymentStatus=${paymentStatus}` : ''}`}
              active={factoryId === String(f.id)}
              label={f.name}
            />
          ))}
        </div>
      )}

      {/* Payment status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {PAYMENT_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/reconciliation/notes?${!isFactory && factoryId ? `factoryId=${factoryId}&` : ''}${s !== '全部' ? `paymentStatus=${s}` : ''}`}
            active={s === '全部' ? !paymentStatus : paymentStatus === s}
            label={s}
            small
          />
        ))}
      </div>

      {/* Notes list */}
      <div className="space-y-2.5">
        {notes.length === 0 && (
          <div className="text-center text-muted-foreground py-12">暂无出库单</div>
        )}
        {notes.map((note) => (
          <Link key={note.id} href={`/reconciliation/notes/${note.id}`}>
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] mb-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-foreground">{note.factory.name}</span>
                      {note.factoryNoteNumber && (
                        <span className="text-xs text-muted-foreground">厂单号:{note.factoryNoteNumber}</span>
                      )}
                    </div>
                    {(() => {
                      const intNos = note.items.map((it) => it.internalNumber).filter(Boolean)
                      if (intNos.length === 0) return null
                      const display = intNos.slice(0, 3).join(', ')
                      const more = intNos.length > 3 ? ` +${intNos.length - 3}` : ''
                      return (
                        <div className="text-xs text-violet-700 mb-1">
                          我方单号: {display}{more}
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      <span>{note.noteDate}</span>
                      <span>·</span>
                      <span>金重 {note.totalGoldWeight.toFixed(2)}g</span>
                      <span>·</span>
                      <span>费用 ¥{note.totalFee.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <span>欠金 {note.currentOwedGold.toFixed(2)}g</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <PaymentBadge status={note.paymentStatus} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* FAB */}
      {!isFactory && (
        <Link
          href="/reconciliation/notes/new"
          className="fixed bottom-20 right-5 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </Link>
      )}
    </AppShell>
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
