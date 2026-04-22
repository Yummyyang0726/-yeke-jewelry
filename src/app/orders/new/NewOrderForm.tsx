'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Using native selects for reliable value display
import { Plus, Trash2 } from 'lucide-react'

type Store = { id: number; name: string; shortName: string }
type Factory = { id: number; name: string }

type Stone = { stoneType: string; quantityWeight: string; unitPrice: string; girdleCode: string; stoneNote: string }
type Material = { category: string; quantityWeight: string; gemSize: string; girdleCode: string; materialNote: string }

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
  const [remarks, setRemarks] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])

  const [stones, setStones] = useState<Stone[]>([{ stoneType: '', quantityWeight: '', unitPrice: '', girdleCode: '', stoneNote: '' }])
  const [materials, setMaterials] = useState<Material[]>([])

  function updateStone(i: number, field: keyof Stone, val: string) {
    setStones((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)))
  }
  function updateMaterial(i: number, field: keyof Material, val: string) {
    setMaterials((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId || !factoryId || !customerName || !customerPhone || !category || !orderDate) {
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
          remarks,
          orderDate,
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
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">选择门店</option>
                {stores.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.shortName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">指派工厂 *</Label>
              <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">选择工厂</option>
                {factories.map((f) => (
                  <option key={f.id} value={String(f.id)}>{f.name}</option>
                ))}
              </select>
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
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">选择类别</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">尺寸</Label>
              <Input className="h-9 text-sm" value={size} onChange={(e) => setSize(e.target.value)} placeholder="如：13号、45cm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">开单日期 *</Label>
            <Input className="h-9 text-sm" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
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

      {/* Stones - 来石记录 */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">来石记录</CardTitle>
            <button
              type="button"
              onClick={() => setStones((prev) => [...prev, { stoneType: '', quantityWeight: '', unitPrice: '', girdleCode: '', stoneNote: '' }])}
              className="text-xs text-primary flex items-center gap-1 hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" /> 添加
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {stones.map((stone, i) => (
            <div key={i} className="relative border border-gray-100 rounded-lg p-3 space-y-2">
              {stones.length > 1 && (
                <button type="button" onClick={() => setStones((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-9 text-sm" value={stone.stoneType} onChange={(e) => updateStone(i, 'stoneType', e.target.value)} placeholder="石种（如：钻石）" />
                <Input className="h-9 text-sm" value={stone.quantityWeight} onChange={(e) => updateStone(i, 'quantityWeight', e.target.value)} placeholder="数量/重量" />
              </div>
              <Input className="h-9 text-sm" value={stone.girdleCode} onChange={(e) => updateStone(i, 'girdleCode', e.target.value)} placeholder="腰码（如：GIA 2215832745）" />
              {isBoss && (
                <Input className="h-9 text-sm" type="number" value={stone.unitPrice} onChange={(e) => updateStone(i, 'unitPrice', e.target.value)} placeholder="石单价（元）" />
              )}
              <Input className="h-9 text-sm" value={stone.stoneNote} onChange={(e) => updateStone(i, 'stoneNote', e.target.value)} placeholder="备注（如：客户自带、需镶嵌）" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Materials (来料) */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">来料说明</CardTitle>
            {materials.length < 5 && (
              <button
                type="button"
                onClick={() => setMaterials((prev) => [...prev, { category: '', quantityWeight: '', gemSize: '', girdleCode: '', materialNote: '' }])}
                className="text-xs text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-3.5 h-3.5" /> 添加
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {materials.length === 0 && (
            <p className="text-xs text-gray-400">点击"添加"填写来料信息</p>
          )}
          {materials.map((mat, i) => (
            <div key={i} className="relative border border-gray-100 rounded-lg p-3 space-y-2">
              <button type="button" onClick={() => setMaterials((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-3 gap-2">
                <Input className="h-9 text-sm" value={mat.category} onChange={(e) => updateMaterial(i, 'category', e.target.value)} placeholder="品类" />
                <Input className="h-9 text-sm" value={mat.quantityWeight} onChange={(e) => updateMaterial(i, 'quantityWeight', e.target.value)} placeholder="数量/重量" />
                <Input className="h-9 text-sm" value={mat.gemSize} onChange={(e) => updateMaterial(i, 'gemSize', e.target.value)} placeholder="宝石尺寸" />
              </div>
              <Input className="h-9 text-sm" value={mat.girdleCode} onChange={(e) => updateMaterial(i, 'girdleCode', e.target.value)} placeholder="腰码" />
              <Input className="h-9 text-sm" value={mat.materialNote} onChange={(e) => updateMaterial(i, 'materialNote', e.target.value)} placeholder="备注" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm text-gray-700">备注</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="款式要求、定制说明、其他备注..."
          />
        </CardContent>
      </Card>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
        {loading ? '提交中...' : '提交订单'}
      </Button>
    </form>
  )
}
