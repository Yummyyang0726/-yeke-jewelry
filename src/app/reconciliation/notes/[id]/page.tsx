import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import { NoteActions } from './NoteActions'
import { NoteImagesSection } from './NoteImagesSection'

type Params = { params: Promise<{ id: string }> }

export default async function NoteDetailPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const note = await prisma.deliveryNote.findUnique({
    where: { id: parseInt(id) },
    include: {
      factory: { select: { name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      images: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!note) notFound()
  if (session.role === 'factory' && note.factoryId !== session.factoryId) {
    redirect('/reconciliation/notes')
  }

  return (
    <AppShell userName={session.name} role={session.role} hideBottomTabs>
      {/* Back + header */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/reconciliation/notes" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground leading-tight">{note.factory.name}</h1>
          <p className="text-xs text-muted-foreground">
            {note.factoryNoteNumber ? `工厂单号 ${note.factoryNoteNumber}` : '出库单详情'}
          </p>
        </div>
        <div className="ml-auto">
          <PaymentBadge status={note.paymentStatus} />
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
              <InfoRow label="工厂" value={note.factory.name} />
              <InfoRow label="日期" value={note.noteDate} />
              {note.factoryNoteNumber && <InfoRow label="工厂单号" value={note.factoryNoteNumber} />}
              {note.noteNumber && <InfoRow label="备用单号" value={note.noteNumber} />}
              {note.settlementMethod && <InfoRow label="结算方式" value={note.settlementMethod} />}
              {note.materialType && <InfoRow label="材料类型" value={note.materialType} />}
            </dl>
            <GoldPriceBreakdown raw={note.goldPriceByMaterial} fallback={note.goldPrice} />
          </CardContent>
        </Card>

        {/* Items table */}
        {note.items.length > 0 && (
          <Card className="shadow-none border-gray-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-gray-700">金料明细 ({note.items.length} 项)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {note.items.map((item) => {
                  const isReturn = item.itemType === '旧料退回'
                  return (
                  <div key={item.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ItemTypeBadge type={item.itemType} />
                        <span className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium">
                          {item.materialType || '18K'}
                        </span>
                        {item.internalNumber && (
                          <span className="inline-flex px-1.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded font-medium">
                            我:{item.internalNumber}
                          </span>
                        )}
                        <span className="font-medium text-sm text-foreground">{item.productName}</span>
                      </div>
                      <span className="text-sm font-semibold text-primary">¥{item.lineTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {item.barcode && <span>条码: {item.barcode}</span>}
                      <span>件数: {item.quantity}</span>
                      <span className={isReturn ? 'text-emerald-700 font-medium' : ''}>
                        金重: {item.goldWeight.toFixed(2)}g
                      </span>
                      {item.feePerGram > 0 && <span>克工费: ¥{item.feePerGram}</span>}
                      {item.feePerPiece > 0 && <span>件工费: ¥{item.feePerPiece}</span>}
                    </div>
                  </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {note.notes && (
          <Card className="shadow-none border-gray-200">
            <CardContent className="px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">备注</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.notes}</div>
            </CardContent>
          </Card>
        )}

        {/* Images / 单据凭证 */}
        <NoteImagesSection
          noteId={note.id}
          initialImages={note.images}
          canEdit={session.role !== 'factory'}
        />

        {/* Summary */}
        <Card className="shadow-none border-gray-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-gray-700">汇总</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <div className="text-lg font-bold text-amber-700">{note.totalGoldWeight.toFixed(2)}g</div>
                <div className="text-xs text-amber-600/70">总金重</div>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-center">
                <div className="text-lg font-bold text-rose-700">¥{note.totalFee.toFixed(2)}</div>
                <div className="text-xs text-rose-600/70">总费用</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="已结金重" value={`${note.settledGoldWeight.toFixed(2)}g`} />
              <InfoRow label="已结金额" value={`¥${note.settledAmount.toFixed(2)}`} />
            </dl>
          </CardContent>
        </Card>

        {/* Balance - per material breakdown */}
        <BalanceCard
          prevOwedGold={note.prevOwedGold}
          prevOwedMoney={note.prevOwedMoney}
          currentOwedGold={note.currentOwedGold}
          currentOwedMoney={note.currentOwedMoney}
          prevOwedGoldByMaterial={note.prevOwedGoldByMaterial}
          currentOwedGoldByMaterial={note.currentOwedGoldByMaterial}
          items={note.items}
          settledGoldWeight={note.settledGoldWeight}
        />

        {/* Actions */}
        {session.role !== 'factory' && (
          <NoteActions noteId={note.id} paymentStatus={note.paymentStatus} />
        )}
      </div>
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

function ItemTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    '定制': 'bg-primary/10 text-primary',
    '进货': 'bg-sky-50 text-sky-700',
    '修理': 'bg-orange-50 text-orange-700',
    '旧料退回': 'bg-emerald-50 text-emerald-700',
  }
  const label = type || '定制'
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-xs rounded font-medium ${styles[label] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
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

const MATERIAL_ORDER = ['18K', '9K', 'PT950', 'PT900', '千足金', '24K足金', '其他']

function GoldPriceBreakdown({ raw, fallback }: { raw: string | null | undefined; fallback: number }) {
  const map = parseMaterialMap(raw)
  const keys = Object.keys(map).sort((a, b) => {
    const ai = MATERIAL_ORDER.indexOf(a)
    const bi = MATERIAL_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  if (keys.length === 0 && fallback > 0) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        金价：¥{fallback.toFixed(2)}/g
      </div>
    )
  }
  if (keys.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {keys.map((mat) => (
        <span
          key={mat}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-amber-200 bg-amber-50/60 text-amber-700"
        >
          <span className="font-medium">{mat}</span>
          <span>¥{map[mat].toFixed(2)}/g</span>
        </span>
      ))}
    </div>
  )
}

function parseMaterialMap(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(obj)) {
        const n = typeof v === 'number' ? v : parseFloat(String(v))
        if (!Number.isNaN(n)) out[k] = n
      }
      return out
    }
  } catch {
    // ignore
  }
  return {}
}

function BalanceCard({
  prevOwedGold,
  prevOwedMoney,
  currentOwedGold,
  currentOwedMoney,
  prevOwedGoldByMaterial,
  currentOwedGoldByMaterial,
  items,
  settledGoldWeight,
}: {
  prevOwedGold: number
  prevOwedMoney: number
  currentOwedGold: number
  currentOwedMoney: number
  prevOwedGoldByMaterial: string
  currentOwedGoldByMaterial: string
  items: { materialType: string; goldWeight: number }[]
  settledGoldWeight: number
}) {
  const prevMap = parseMaterialMap(prevOwedGoldByMaterial)
  const currentMap = parseMaterialMap(currentOwedGoldByMaterial)

  // Added by material from items
  const addedMap: Record<string, number> = {}
  for (const it of items) {
    const key = it.materialType || '18K'
    addedMap[key] = (addedMap[key] || 0) + it.goldWeight
  }

  // Union of keys
  const keys = new Set<string>([
    ...Object.keys(prevMap).filter((k) => prevMap[k] !== 0),
    ...Object.keys(addedMap),
    ...Object.keys(currentMap).filter((k) => currentMap[k] !== 0),
  ])
  const sortedKeys = [...keys].sort((a, b) => {
    const ai = MATERIAL_ORDER.indexOf(a)
    const bi = MATERIAL_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const hasBreakdown = sortedKeys.length > 0

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-gray-700">余额结转</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {hasBreakdown && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground font-medium mb-1">按材质（g）</div>
            <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-1 text-[11px] text-muted-foreground px-1">
              <div>材质</div>
              <div className="text-right">上期欠</div>
              <div className="text-right">本期发</div>
              <div className="text-right">本期欠</div>
            </div>
            {sortedKeys.map((mat) => {
              const prev = prevMap[mat] || 0
              const added = addedMap[mat] || 0
              const current = currentMap[mat] || 0
              return (
                <div key={mat} className="grid grid-cols-[56px_1fr_1fr_1fr] gap-1 items-center">
                  <div className="text-xs font-medium">{mat}</div>
                  <div className="text-right text-xs text-muted-foreground">{prev.toFixed(2)}</div>
                  <div className="text-right text-xs text-amber-700">+{added.toFixed(2)}</div>
                  <div className={`text-right text-xs font-semibold ${current > 0 ? 'text-rose-700' : current < 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                    {current.toFixed(2)}
                  </div>
                </div>
              )
            })}
            <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-1 items-center pt-2 border-t border-border">
              <div className="text-xs font-bold">合计</div>
              <div className="text-right text-xs text-muted-foreground">{prevOwedGold.toFixed(2)}</div>
              <div className="text-right text-xs text-amber-700">+{items.reduce((s, it) => s + it.goldWeight, 0).toFixed(2)}</div>
              <div className={`text-right text-xs font-bold ${currentOwedGold > 0 ? 'text-rose-700' : currentOwedGold < 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                {currentOwedGold.toFixed(2)}
              </div>
            </div>
            {settledGoldWeight > 0 && (
              <div className="text-[11px] text-muted-foreground text-right pt-1">本期已结：{settledGoldWeight.toFixed(2)}g</div>
            )}
          </div>
        )}

        {!hasBreakdown && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="上期欠金" value={`${prevOwedGold.toFixed(2)}g`} />
            <InfoRow label="本期欠金" value={`${currentOwedGold.toFixed(2)}g`} />
          </dl>
        )}

        {/* Money balance */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground font-medium">欠款（元）</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="上期欠款" value={`¥${prevOwedMoney.toFixed(2)}`} />
            <InfoRow label="本期欠款" value={`¥${currentOwedMoney.toFixed(2)}`} />
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}
