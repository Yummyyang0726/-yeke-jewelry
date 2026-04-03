'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

type Store = { id: number; name: string; shortName: string }
type Factory = { id: number; name: string }

type Stone = { stoneType: string; quantityWeight: string; unitPrice: string }
type Material = { category: string; quantityWeight: string; gemSize: string }

const CATEGORIES = ['戒指', '吊坠', '项链', '手镯', '耳饰', '胸针', '改款翻新', '其他']

export function NewOrderForm({
  stores,
  factories,
  isBoss,
}: {
  stores: Store[]
  factories: Factory[]
  isBoss: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [storeId, setStoreId] = useState('')
  const [factoryId, setFactoryId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [category, setCategory] = useState('')
  const [size, setSize] = useState('')
  const [laborFee, setLaborFee] = useState('')
  const [goldPrice, setGoldPrice] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')
  const [styleNotes, setStyleNotes] = useState('')
  const [remarks, setRemarks] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')

  const [stones, setStones] = useState<Stone[]>([{ stoneType: '', quantityWeight: '', unitPrice: '' }])
  const [materials, setMaterials] = useState<Material[]>([])

  function updateStone(i: number, field: keyof Stone, val: string) {
    setStones((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)))
  }
  function updateMaterial(i: number, field: keyof Material, val: string) {
    setMaterials((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId || !factoryId || !customerName || !customerPhone || !category || !deliveryDate) {
      toast.error('请填写必填项')
      return
    }
    setLoading(true)
    try {
      const validStones = stones.filter((s) => s.stoneType && s.quantityWeight)
      const validMaterials = materials.filter((m) => m.category && m.quantityWeight)

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          factoryId,
          customerName,
          customerPhone,
          category,
          size,
          laborFee,
          goldPrice,
          materialDesc,
          styleNotes,
          remarks,
          deliveryDate,
          stones: validStones,
          materials: validMaterials,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '提交失败')
        return
      }
      toast.success(`订单 ${data.orderNo} 创建成功`)
      router.push(`/orders/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic info */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">门店 *</Label>
              <Select value={storeId} onValueChange={(val) => setStoreId(val ?? '')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择门店" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.shortName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">指派工厂 *</Label>
              <Select value={factoryId} onValueChange={(val) => setFactoryId(val ?? '')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择工厂" />
                </SelectTrigger>
                <SelectContent>
                  {factories.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">顾客姓名 *</Label>
              <Input className="h-9 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="姓名" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">顾客电话 *</Label>
              <Input className="h-9 text-sm" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="手机号" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">定制类别 *</Label>
              <Select value={category} onValueChange={(val) => setCategory(val ?? '')}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="选择类别" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">尺寸</Label>
              <Input className="h-9 text-sm" value={size} onChange={(e) => setSize(e.target.value)} placeholder="如：13号、45cm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">交货日期 *</Label>
            <Input className="h-9 text-sm" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          {isBoss && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">工费（元）</Label>
                <Input className="h-9 text-sm" type="number" value={laborFee} onChange={(e) => setLaborFee(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">当日金价（元/g）</Label>
                <Input className="h-9 text-sm" type="number" value={goldPrice} onChange={(e) => setGoldPrice(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">定制用料</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">用料描述及含损耗</Label>
            <Input className="h-9 text-sm" value={materialDesc} onChange={(e) => setMaterialDesc(e.target.value)} placeholder="如：18K白金 3.2g" />
          </div>
        </CardContent>
      </Card>

      {/* Stones */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">定制用石</CardTitle>
            <button
              type="button"
              onClick={() => setStones((prev) => [...prev, { stoneType: '', quantityWeight: '', unitPrice: '' }])}
              className="text-xs text-amber-700 flex items-center gap-1 hover:text-amber-800"
            >
              <Plus className="w-3.5 h-3.5" /> 添加
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {stones.map((stone, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input className="h-9 text-sm" value={stone.stoneType} onChange={(e) => updateStone(i, 'stoneType', e.target.value)} placeholder="石种（如：钻石）" />
                <Input className="h-9 text-sm" value={stone.quantityWeight} onChange={(e) => updateStone(i, 'quantityWeight', e.target.value)} placeholder="数量/重量" />
                {isBoss && (
                  <Input className="h-9 text-sm col-span-2" type="number" value={stone.unitPrice} onChange={(e) => updateStone(i, 'unitPrice', e.target.value)} placeholder="石单价（元）" />
                )}
              </div>
              {stones.length > 1 && (
                <button type="button" onClick={() => setStones((prev) => prev.filter((_, idx) => idx !== i))} className="mt-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Materials (来料) */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">来料说明</CardTitle>
            {materials.length < 3 && (
              <button
                type="button"
                onClick={() => setMaterials((prev) => [...prev, { category: '', quantityWeight: '', gemSize: '' }])}
                className="text-xs text-amber-700 flex items-center gap-1 hover:text-amber-800"
              >
                <Plus className="w-3.5 h-3.5" /> 添加
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {materials.length === 0 && (
            <p className="text-xs text-gray-400">点击"添加"填写来料信息（最多3组）</p>
          )}
          {materials.map((mat, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input className="h-9 text-sm" value={mat.category} onChange={(e) => updateMaterial(i, 'category', e.target.value)} placeholder="品类" />
                <Input className="h-9 text-sm" value={mat.quantityWeight} onChange={(e) => updateMaterial(i, 'quantityWeight', e.target.value)} placeholder="数量/重量" />
                <Input className="h-9 text-sm" value={mat.gemSize} onChange={(e) => updateMaterial(i, 'gemSize', e.target.value)} placeholder="宝石尺寸" />
              </div>
              <button type="button" onClick={() => setMaterials((prev) => prev.filter((_, idx) => idx !== i))} className="mt-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">款式说明 / 备注</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">款式说明</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
              placeholder="描述款式要求..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">备注</Label>
            <Input className="h-9 text-sm" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="其他备注" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full bg-amber-700 hover:bg-amber-800 h-11" disabled={loading}>
        {loading ? '提交中...' : '提交订单'}
      </Button>
    </form>
  )
}
