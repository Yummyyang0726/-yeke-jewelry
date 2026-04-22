import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Scale, FileText, ClipboardList, ChevronRight } from 'lucide-react'

const MATERIAL_ORDER = ['18K', '9K', 'PT950', 'PT900', '千足金', '24K足金', '其他']

function parseBalanceMap(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(obj)) {
        const n = typeof v === 'number' ? v : parseFloat(String(v))
        if (!Number.isNaN(n) && n !== 0) out[k] = n
      }
      return out
    }
  } catch {
    // ignore
  }
  return {}
}

function sortedMaterialKeys(map: Record<string, number>): string[] {
  return Object.keys(map).sort((a, b) => {
    const ai = MATERIAL_ORDER.indexOf(a)
    const bi = MATERIAL_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default async function ReconciliationPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isFactory = session.role === 'factory'

  const [factories, noteCount, receiptCount] = await Promise.all([
    isFactory
      ? prisma.factory.findMany({ where: { id: session.factoryId! } })
      : prisma.factory.findMany({ orderBy: { id: 'asc' } }),
    prisma.deliveryNote.count({
      where: isFactory ? { factoryId: session.factoryId! } : undefined,
    }),
    isFactory
      ? Promise.resolve(0)
      : prisma.refineryReceipt.count(),
  ])

  // For each factory, find the latest delivery note to get current balance
  const factoryBalances = await Promise.all(
    factories.map(async (f) => {
      const lastNote = await prisma.deliveryNote.findFirst({
        where: { factoryId: f.id },
        orderBy: [{ noteDate: 'desc' }, { id: 'desc' }],
        select: {
          currentOwedGold: true,
          currentOwedMoney: true,
          currentOwedGoldByMaterial: true,
        },
      })
      const byMaterialRaw = lastNote?.currentOwedGoldByMaterial ?? f.initialOwedGoldByMaterial
      return {
        id: f.id,
        name: f.name,
        currentOwedGold: lastNote?.currentOwedGold ?? f.initialOwedGold,
        currentOwedMoney: lastNote?.currentOwedMoney ?? f.initialOwedMoney,
        byMaterial: parseBalanceMap(byMaterialRaw),
      }
    })
  )

  return (
    <AppShell userName={session.name} role={session.role} title="金料对账">
      {/* Stats overview */}
      <div className={`grid ${isFactory ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-5`}>
        <div className="rounded-xl p-3 text-center text-orange-600 bg-orange-50">
          <div className="text-2xl font-bold">{noteCount}</div>
          <div className="text-xs mt-0.5 opacity-75">出库单总数</div>
        </div>
        {!isFactory && (
          <div className="rounded-xl p-3 text-center text-sky-600 bg-sky-50">
            <div className="text-2xl font-bold">{receiptCount}</div>
            <div className="text-xs mt-0.5 opacity-75">收料单总数</div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className={`grid ${isFactory ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-5`}>
        <Link href="/reconciliation/notes">
          <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">出库单列表</div>
                <div className="text-xs text-muted-foreground">{noteCount} 条记录</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        {!isFactory && (
          <Link href="/reconciliation/receipts">
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">收料单列表</div>
                  <div className="text-xs text-muted-foreground">{receiptCount} 条记录</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Factory balances */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="w-4 h-4" />
          {isFactory ? '我的余额' : '工厂余额'}
        </h2>
      </div>
      <div className="space-y-2.5">
        {factoryBalances.length === 0 && (
          <div className="text-center text-muted-foreground py-12">暂无工厂数据</div>
        )}
        {factoryBalances.map((f) => {
          const matKeys = sortedMaterialKeys(f.byMaterial)
          return (
            <Card key={f.id} className="shadow-none border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{f.name}</span>
                  <Link
                    href={`/reconciliation/notes?factoryId=${f.id}`}
                    className="text-xs text-primary flex items-center gap-0.5"
                  >
                    查看明细 <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <div className="text-lg font-bold text-amber-700">
                      {f.currentOwedGold.toFixed(2)}g
                    </div>
                    <div className="text-xs text-amber-600/70 mt-0.5">欠金余额</div>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3 text-center">
                    <div className="text-lg font-bold text-rose-700">
                      ¥{f.currentOwedMoney.toFixed(2)}
                    </div>
                    <div className="text-xs text-rose-600/70 mt-0.5">欠款余额</div>
                  </div>
                </div>
                {matKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {matKeys.map((mat) => {
                      const v = f.byMaterial[mat]
                      const positive = v > 0
                      return (
                        <span
                          key={mat}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${
                            positive
                              ? 'bg-amber-50/60 text-amber-700 border-amber-200'
                              : 'bg-emerald-50/60 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span className="font-medium">{mat}</span>
                          <span>{v > 0 ? '+' : ''}{v.toFixed(2)}g</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
