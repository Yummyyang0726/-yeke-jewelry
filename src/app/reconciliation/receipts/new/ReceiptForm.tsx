'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

type Factory = { id: number; name: string }

type Item = {
  materialName: string
  incomingWeight: string
  postMeltWeight: string
  conversionRate: string
  convertedWeight: string
}

const emptyItem = (): Item => ({
  materialName: '',
  incomingWeight: '',
  postMeltWeight: '',
  conversionRate: '1',
  convertedWeight: '0',
})

export function ReceiptForm({ factories }: { factories: Factory[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [factoryId, setFactoryId] = useState('')
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receiptNumber, setReceiptNumber] = useState('')
  const [refineryName, setRefineryName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippedDate, setShippedDate] = useState('')
  const [shippedWeight, setShippedWeight] = useState('')

  const [items, setItems] = useState<Item[]>([emptyItem()])

  // Calculate totals
  const totalIncoming = items.reduce((sum, it) => sum + (parseFloat(it.incomingWeight) || 0), 0)
  const totalPostMelt = items.reduce((sum, it) => sum + (parseFloat(it.postMeltWeight) || 0), 0)
  const totalConverted = items.reduce((sum, it) => sum + (parseFloat(it.convertedWeight) || 0), 0)

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const updated = { ...it, [field]: value }
        // Auto-calculate convertedWeight = postMeltWeight * conversionRate
        const pmw = parseFloat(updated.postMeltWeight) || 0
        const cr = parseFloat(updated.conversionRate) || 1
        updated.convertedWeight = (pmw * cr).toFixed(2)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!receiptDate) {
      toast.error('请填写收料日期')
      return
    }
    setLoading(true)
    try {
      const validItems = items.filter((it) => it.materialName.trim() || parseFloat(it.incomingWeight) > 0)
      const res = await fetch('/api/reconciliation/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: factoryId ? parseInt(factoryId) : null,
          receiptDate,
          receiptNumber,
          refineryName,
          trackingNumber,
          shippedDate: shippedDate || null,
          shippedWeight: parseFloat(shippedWeight) || 0,
          totalIncoming,
          totalPostMelt,
          totalConverted,
          items: validItems.map((it, idx) => ({
            materialName: it.materialName,
            incomingWeight: parseFloat(it.incomingWeight) || 0,
            postMeltWeight: parseFloat(it.postMeltWeight) || 0,
            conversionRate: parseFloat(it.conversionRate) || 1,
            convertedWeight: parseFloat(it.convertedWeight) || 0,
            sortOrder: idx,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '创建失败')
        return
      }
      toast.success('收料单创建成功')
      router.push('/reconciliation/receipts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Back */}
      <div className="flex items-center gap-2 mb-2">
        <Link href="/reconciliation/receipts" className="text-muted-foreground hover:text-foreground">
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
            <Label className="text-xs">关联工厂</Label>
            <Select value={factoryId} onValueChange={(val) => setFactoryId(val ?? '')}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="选择工厂（可选）" />
              </SelectTrigger>
              <SelectContent>
                {factories.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">收料日期 *</Label>
              <Input className="h-9 text-sm" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">收料单号</Label>
              <Input className="h-9 text-sm" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="单号" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">精炼厂名称</Label>
            <Input className="h-9 text-sm" value={refineryName} onChange={(e) => setRefineryName(e.target.value)} placeholder="精炼厂名称" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">快递单号</Label>
              <Input className="h-9 text-sm" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="快递单号" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">寄出日期</Label>
              <Input className="h-9 text-sm" type="date" value={shippedDate} onChange={(e) => setShippedDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">寄出重量(g)</Label>
            <Input className="h-9 text-sm" type="number" step="0.01" value={shippedWeight} onChange={(e) => setShippedWeight(e.target.value)} placeholder="0" />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">收料明细</CardTitle>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-primary flex items-center gap-1 hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" /> 添加
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">第 {i + 1} 项</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input className="h-9 text-sm" value={item.materialName} onChange={(e) => updateItem(i, 'materialName', e.target.value)} placeholder="材料名称" />
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-9 text-sm" type="number" step="0.01" value={item.incomingWeight} onChange={(e) => updateItem(i, 'incomingWeight', e.target.value)} placeholder="来料重量(g)" />
                <Input className="h-9 text-sm" type="number" step="0.01" value={item.postMeltWeight} onChange={(e) => updateItem(i, 'postMeltWeight', e.target.value)} placeholder="熔后重量(g)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-9 text-sm" type="number" step="0.0001" value={item.conversionRate} onChange={(e) => updateItem(i, 'conversionRate', e.target.value)} placeholder="折算率" />
                <div className="flex items-center h-9 px-3 bg-accent rounded-md text-sm text-accent-foreground">
                  折足: {item.convertedWeight}g
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">汇总</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-sky-50 p-3 text-center">
              <div className="text-base font-bold text-sky-700">{totalIncoming.toFixed(2)}g</div>
              <div className="text-xs text-sky-600/70">来料总重</div>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-center">
              <div className="text-base font-bold text-violet-700">{totalPostMelt.toFixed(2)}g</div>
              <div className="text-xs text-violet-600/70">熔后总重</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <div className="text-base font-bold text-emerald-700">{totalConverted.toFixed(2)}g</div>
              <div className="text-xs text-emerald-600/70">折足总重</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
        {loading ? '提交中...' : '提交收料单'}
      </Button>
    </form>
  )
}
