'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type Factory = { id: number; name: string; noteTemplate?: string }

type Item = {
  itemType: string
  materialType: string
  internalNumber: string
  productName: string
  quantity: string
  goldWeight: string
  feePerGram: string
  feePerPiece: string
  lineTotal: string
}

const MATERIAL_TYPES = ['18K', '9K', 'PT950', 'PT900', '千足金', '24K足金']
const OTHER_MATERIAL = '其他'

const ITEM_TYPES = [
  { value: '定制', label: '定制', hint: '有我方单号的定做款（镶嵌/素金定制）' },
  { value: '进货', label: '进货', hint: '现货/普通货品，无我方单号' },
  { value: '修理', label: '修理', hint: '维修件，单号可选' },
  { value: '旧料退回', label: '旧料退回', hint: '旧金件寄回，金重自动负数抵扣欠金' },
] as const

function getTypeHint(type: string): string {
  return ITEM_TYPES.find((t) => t.value === type)?.hint ?? ''
}

const emptyItem = (): Item => ({
  itemType: '定制',
  materialType: '18K',
  internalNumber: '',
  productName: '',
  quantity: '1',
  goldWeight: '',
  feePerGram: '',
  feePerPiece: '',
  lineTotal: '0',
})

// 旧料退回的金重在聚合/入库时取负值
function signedGoldWeight(it: Item): number {
  const gw = parseFloat(it.goldWeight) || 0
  if (gw === 0) return 0
  const mag = Math.abs(gw)
  return it.itemType === '旧料退回' ? -mag : mag
}

function parseBalanceMap(raw: string | null | undefined): Record<string, number> {
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

export function NoteForm({ factories }: { factories: Factory[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [factoryId, setFactoryId] = useState('')
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [factoryNoteNumber, setFactoryNoteNumber] = useState('')
  const [goldPriceByMaterial, setGoldPriceByMaterial] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<Item[]>([emptyItem()])

  const [settledAmount, setSettledAmount] = useState('')

  // Per-material prev balance (loaded from last note)
  const [prevOwedGoldByMaterial, setPrevOwedGoldByMaterial] = useState<Record<string, number>>({})
  // Per-material settled this period (user input)
  const [settledByMaterial, setSettledByMaterial] = useState<Record<string, string>>({})

  const [prevOwedMoney, setPrevOwedMoney] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Calculate totals（旧料退回按负数参与）
  const totalGoldWeight = items.reduce((sum, it) => sum + signedGoldWeight(it), 0)
  const totalFee = items.reduce((sum, it) => sum + (parseFloat(it.lineTotal) || 0), 0)

  // Per-material added this period (from items)
  const addedByMaterial = useMemo(() => {
    const map: Record<string, number> = {}
    for (const it of items) {
      const gw = signedGoldWeight(it)
      if (gw === 0) continue
      const key = it.materialType || '18K'
      map[key] = (map[key] || 0) + gw
    }
    return map
  }, [items])

  // Union of material keys to display in the breakdown table
  const balanceMaterialKeys = useMemo(() => {
    const keys = new Set<string>()
    Object.keys(prevOwedGoldByMaterial).forEach((k) => {
      if ((prevOwedGoldByMaterial[k] || 0) !== 0) keys.add(k)
    })
    Object.keys(addedByMaterial).forEach((k) => keys.add(k))
    Object.keys(settledByMaterial).forEach((k) => {
      if ((parseFloat(settledByMaterial[k]) || 0) !== 0) keys.add(k)
    })
    // Sort by MATERIAL_TYPES order, unknowns last
    return [...keys].sort((a, b) => {
      const ai = MATERIAL_TYPES.indexOf(a)
      const bi = MATERIAL_TYPES.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [prevOwedGoldByMaterial, addedByMaterial, settledByMaterial])

  // Per-material current owed (prev + added - settled)
  const currentOwedByMaterial = useMemo(() => {
    const map: Record<string, number> = {}
    for (const k of balanceMaterialKeys) {
      const prev = prevOwedGoldByMaterial[k] || 0
      const added = addedByMaterial[k] || 0
      const settled = parseFloat(settledByMaterial[k] || '0') || 0
      map[k] = prev + added - settled
    }
    return map
  }, [balanceMaterialKeys, prevOwedGoldByMaterial, addedByMaterial, settledByMaterial])

  const totalSettledGoldWeight = useMemo(() => {
    return Object.values(settledByMaterial).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  }, [settledByMaterial])

  const prevOwedGoldTotal = useMemo(() => {
    return Object.values(prevOwedGoldByMaterial).reduce((s, v) => s + (v || 0), 0)
  }, [prevOwedGoldByMaterial])

  const currentOwedGoldTotal = useMemo(() => {
    return Object.values(currentOwedByMaterial).reduce((s, v) => s + (v || 0), 0)
  }, [currentOwedByMaterial])

  const currentOwedMoney = prevOwedMoney + totalFee - (parseFloat(settledAmount) || 0)

  // Fetch last note balance when factory changes
  const fetchBalance = useCallback(async (fId: string) => {
    if (!fId) return
    setBalanceLoading(true)
    try {
      const res = await fetch(`/api/reconciliation/factory/${fId}/last-note`)
      if (res.ok) {
        const data = await res.json()
        setPrevOwedMoney(data.currentOwedMoney ?? 0)
        const byMat = parseBalanceMap(data.currentOwedGoldByMaterial)
        // Fallback: if byMat is empty but total owed > 0, put it under '18K'
        if (Object.keys(byMat).length === 0 && (data.currentOwedGold ?? 0) !== 0) {
          byMat['18K'] = data.currentOwedGold
        }
        setPrevOwedGoldByMaterial(byMat)
      } else {
        setPrevOwedMoney(0)
        setPrevOwedGoldByMaterial({})
      }
    } catch {
      setPrevOwedMoney(0)
      setPrevOwedGoldByMaterial({})
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (factoryId) fetchBalance(factoryId)
  }, [factoryId, fetchBalance])

  // Apply factory's material template when selection changes (if current items are empty)
  useEffect(() => {
    if (!factoryId) return
    const f = factories.find((x) => String(x.id) === factoryId)
    if (!f?.noteTemplate) return
    let template: string[] = []
    try {
      const arr = JSON.parse(f.noteTemplate)
      if (Array.isArray(arr)) template = arr
    } catch {
      return
    }
    if (template.length === 0) return
    // Only apply if user hasn't entered any data yet
    const allEmpty = items.every((it) => !it.productName && !it.goldWeight)
    if (!allEmpty) return
    setItems(template.map((m) => ({ ...emptyItem(), materialType: m })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryId])

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const updated = { ...it, [field]: value }
        // Auto-calculate lineTotal
        const qty = parseInt(updated.quantity) || 1
        const gw = parseFloat(updated.goldWeight) || 0
        const fpg = parseFloat(updated.feePerGram) || 0
        const fpp = parseFloat(updated.feePerPiece) || 0
        const lt = gw * fpg + qty * fpp
        updated.lineTotal = lt.toFixed(2)
        return updated
      })
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSettled(material: string, value: string) {
    setSettledByMaterial((prev) => ({ ...prev, [material]: value }))
  }

  function updateGoldPrice(material: string, value: string) {
    setGoldPriceByMaterial((prev) => ({ ...prev, [material]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factoryId || !noteDate) {
      toast.error('请选择工厂和日期')
      return
    }
    const validItems = items.filter((it) => it.goldWeight || it.lineTotal !== '0' || it.productName.trim())
    if (validItems.length === 0) {
      toast.error('请至少添加一行金料')
      return
    }
    setLoading(true)
    try {
      // Build by-material balance maps for saving
      const prevMap: Record<string, number> = {}
      for (const [k, v] of Object.entries(prevOwedGoldByMaterial)) {
        if ((v || 0) !== 0) prevMap[k] = +v.toFixed(4)
      }
      const currentMap: Record<string, number> = {}
      for (const [k, v] of Object.entries(currentOwedByMaterial)) {
        if ((v || 0) !== 0) currentMap[k] = +v.toFixed(4)
      }
      // Build gold-price-by-material map (only non-zero entries)
      const priceMap: Record<string, number> = {}
      for (const [k, v] of Object.entries(goldPriceByMaterial)) {
        const n = parseFloat(v)
        if (!Number.isNaN(n) && n > 0) priceMap[k] = n
      }
      // Compute aggregate goldPrice as a weighted avg by goldWeight magnitude (for legacy field)
      let weightedSum = 0
      let weightTotal = 0
      for (const it of validItems) {
        const w = Math.abs(parseFloat(it.goldWeight) || 0)
        const p = priceMap[it.materialType] || 0
        if (w > 0 && p > 0) {
          weightedSum += w * p
          weightTotal += w
        }
      }
      const aggregateGoldPrice = weightTotal > 0 ? weightedSum / weightTotal : 0

      const res = await fetch('/api/reconciliation/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: parseInt(factoryId),
          noteDate,
          noteNumber: '',
          factoryNoteNumber,
          materialType: validItems[0]?.materialType ?? '',
          goldPrice: aggregateGoldPrice,
          goldPriceByMaterial: JSON.stringify(priceMap),
          totalGoldWeight,
          totalFee,
          settledGoldWeight: totalSettledGoldWeight,
          settledAmount: parseFloat(settledAmount) || 0,
          prevOwedGold: prevOwedGoldTotal,
          prevOwedMoney,
          currentOwedGold: currentOwedGoldTotal,
          currentOwedMoney,
          prevOwedGoldByMaterial: JSON.stringify(prevMap),
          currentOwedGoldByMaterial: JSON.stringify(currentMap),
          notes,
          items: validItems.map((it, idx) => ({
            itemType: it.itemType || '定制',
            materialType: it.materialType,
            // 进货没有我方单号
            internalNumber: it.itemType === '进货' ? '' : it.internalNumber,
            productName: it.productName || it.materialType,
            quantity: parseInt(it.quantity) || 1,
            // 旧料退回金重自动取负
            goldWeight: signedGoldWeight(it),
            feePerGram: parseFloat(it.feePerGram) || 0,
            feePerPiece: parseFloat(it.feePerPiece) || 0,
            lineTotal: parseFloat(it.lineTotal) || 0,
            sortOrder: idx,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '创建失败')
        return
      }
      toast.success('出库单创建成功，可在详情页上传照片')
      router.push(`/reconciliation/notes/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Back */}
      <div className="flex items-center gap-2 mb-2">
        <Link href="/reconciliation/notes" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm text-muted-foreground">返回列表</span>
      </div>

      {/* Basic info */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">工厂 *</Label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className={selectClass}
            >
              <option value="">选择工厂</option>
              {factories.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">日期 *</Label>
              <Input className="h-9 text-sm" type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">工厂单号</Label>
              <Input className="h-9 text-sm" value={factoryNoteNumber} onChange={(e) => setFactoryNoteNumber(e.target.value)} placeholder="如 2500570" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">提示：每件商品的「我方单号」在下方明细中分别填写</p>
        </CardContent>
      </Card>

      {/* Items - 金料明细 */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">金料明细</CardTitle>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-primary flex items-center gap-1 hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" /> 添加一行
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {items.map((item, i) => {
            const isStandard = MATERIAL_TYPES.includes(item.materialType)
            const isOther = !isStandard
            return (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">第 {i + 1} 行</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Item type chips + hint */}
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {ITEM_TYPES.map(({ value, label }) => {
                    const on = item.itemType === value
                    const isReturn = value === '旧料退回'
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateItem(i, 'itemType', value)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          on
                            ? isReturn
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:border-primary/40'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className={`text-[11px] mt-1 ${item.itemType === '旧料退回' ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {getTypeHint(item.itemType)}
                </div>
              </div>

              {/* Material chips */}
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_TYPES.map((t) => {
                  const on = item.materialType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateItem(i, 'materialType', t)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        on
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:border-primary/40'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => updateItem(i, 'materialType', isOther ? item.materialType : '')}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    isOther
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:border-primary/40'
                  }`}
                >
                  {OTHER_MATERIAL}
                </button>
              </div>
              {isOther && (
                <Input
                  className="h-9 text-sm"
                  value={item.materialType}
                  onChange={(e) => updateItem(i, 'materialType', e.target.value)}
                  placeholder="自定义材质名称（如 22K、铂金合金）"
                  autoFocus
                />
              )}
              {item.itemType === '进货' ? (
                <Input
                  className="h-9 text-sm"
                  value={item.productName}
                  onChange={(e) => updateItem(i, 'productName', e.target.value)}
                  placeholder="款号/品名（进货无我方单号）"
                />
              ) : (
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <Input
                    className="h-9 text-sm"
                    value={item.internalNumber}
                    onChange={(e) => updateItem(i, 'internalNumber', e.target.value)}
                    placeholder={item.itemType === '修理' ? '维修单号(可选)' : '我方单号'}
                  />
                  <Input
                    className="h-9 text-sm"
                    value={item.productName}
                    onChange={(e) => updateItem(i, 'productName', e.target.value)}
                    placeholder={
                      item.itemType === '修理'
                        ? '款号/品名（如：2806 修理）'
                        : item.itemType === '旧料退回'
                        ? '品名（如：旧金件回收）'
                        : '款号/品名（如：牛头项链）'
                    }
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Input className="h-9 text-sm" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="件数" />
                <Input
                  className="h-9 text-sm"
                  type="number"
                  step="0.01"
                  value={item.goldWeight}
                  onChange={(e) => updateItem(i, 'goldWeight', e.target.value)}
                  placeholder={item.itemType === '旧料退回' ? '金重(g) 自动负数' : '金重(g) *'}
                />
                <Input
                  className="h-9 text-sm"
                  type="number"
                  step="0.01"
                  value={goldPriceByMaterial[item.materialType] ?? ''}
                  onChange={(e) => updateGoldPrice(item.materialType, e.target.value)}
                  placeholder={`${item.materialType || '金'}价(元/g)`}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input className="h-9 text-sm" type="number" step="0.01" value={item.feePerGram} onChange={(e) => updateItem(i, 'feePerGram', e.target.value)} placeholder="克工费" />
                <Input className="h-9 text-sm" type="number" step="0.01" value={item.feePerPiece} onChange={(e) => updateItem(i, 'feePerPiece', e.target.value)} placeholder="件工费" />
                <div className="flex items-center h-9 px-3 bg-accent rounded-md text-sm text-accent-foreground">
                  小计: ¥{item.lineTotal}
                </div>
              </div>
              {item.itemType === '旧料退回' && (parseFloat(item.goldWeight) || 0) > 0 && (
                <div className="text-[11px] text-emerald-700">
                  将按 <span className="font-semibold">-{Math.abs(parseFloat(item.goldWeight)).toFixed(2)}g</span> 计入金料账（抵扣欠金）
                </div>
              )}
            </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">备注</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="其他说明..."
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">本期合计</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <div className="text-lg font-bold text-amber-700">{totalGoldWeight.toFixed(2)}g</div>
              <div className="text-xs text-amber-600/70">总金重</div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-center">
              <div className="text-lg font-bold text-rose-700">¥{totalFee.toFixed(2)}</div>
              <div className="text-xs text-rose-600/70">总工费</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">已付工费(元)</Label>
            <Input className="h-9 text-sm" type="number" step="0.01" value={settledAmount} onChange={(e) => setSettledAmount(e.target.value)} placeholder="0" />
          </div>
        </CardContent>
      </Card>

      {/* Balance — per-material breakdown */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">
            欠金结转（按材质）
            {balanceLoading && <span className="text-xs text-muted-foreground ml-2">加载中...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {balanceMaterialKeys.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              暂无欠金数据（选择工厂并添加金料后显示）
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-1 text-[11px] text-muted-foreground font-medium px-1">
                <div>材质</div>
                <div className="text-right">上期欠</div>
                <div className="text-right">本期发</div>
                <div className="text-right">本期结</div>
                <div className="text-right">本期欠</div>
              </div>
              {balanceMaterialKeys.map((mat) => {
                const prev = prevOwedGoldByMaterial[mat] || 0
                const added = addedByMaterial[mat] || 0
                const settled = settledByMaterial[mat] ?? ''
                const current = currentOwedByMaterial[mat] || 0
                return (
                  <div key={mat} className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-1 items-center">
                    <div className="text-xs font-medium">{mat}</div>
                    <div className="text-right text-xs text-muted-foreground">{prev.toFixed(2)}g</div>
                    <div className="text-right text-xs text-amber-700">+{added.toFixed(2)}g</div>
                    <Input
                      className="h-8 text-xs text-right px-2"
                      type="number"
                      step="0.01"
                      value={settled}
                      onChange={(e) => updateSettled(mat, e.target.value)}
                      placeholder="0"
                    />
                    <div className={`text-right text-xs font-semibold ${current > 0 ? 'text-rose-700' : current < 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      {current.toFixed(2)}g
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-1 items-center pt-2 border-t border-border">
                <div className="text-xs font-bold">合计</div>
                <div className="text-right text-xs text-muted-foreground">{prevOwedGoldTotal.toFixed(2)}g</div>
                <div className="text-right text-xs text-amber-700">+{totalGoldWeight.toFixed(2)}g</div>
                <div className="text-right text-xs text-muted-foreground pr-2">{totalSettledGoldWeight.toFixed(2)}g</div>
                <div className={`text-right text-xs font-bold ${currentOwedGoldTotal > 0 ? 'text-rose-700' : currentOwedGoldTotal < 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {currentOwedGoldTotal.toFixed(2)}g
                </div>
              </div>
            </div>
          )}

          {/* Money balance */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-xs text-muted-foreground font-medium">欠款结转</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">上期欠款</div>
                <div className="h-8 flex items-center px-2 bg-accent rounded text-accent-foreground">¥{prevOwedMoney.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">本期工费</div>
                <div className="h-8 flex items-center px-2 bg-accent rounded text-accent-foreground">¥{totalFee.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-rose-600 mb-0.5 font-medium">本期欠款</div>
                <div className={`h-8 flex items-center px-2 rounded font-semibold ${currentOwedMoney > 0 ? 'bg-rose-50 text-rose-700' : 'bg-accent text-accent-foreground'}`}>
                  ¥{currentOwedMoney.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pb-2 text-xs text-muted-foreground text-center">
        保存后，在详情页可上传单据照片作凭证
      </div>
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
        {loading ? '提交中...' : '保存出库单'}
      </Button>
    </form>
  )
}
