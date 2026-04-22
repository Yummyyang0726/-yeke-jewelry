'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Field = {
  key: string
  label: string
  placeholder?: string
  isAmount?: boolean
}

export function SettlementForm({ orderId }: { orderId: number }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    goldMaterial: '',
    goldLoss: '',
    goldWeight: '',
    goldUnitPrice: '',
    goldAmount: '',
    stone1Material: '',
    stone1Weight: '',
    stone1Price: '',
    stone1Amount: '',
    stone2Material: '',
    stone2Weight: '',
    stone2Price: '',
    stone2Amount: '',
    oldOffset1: '',
    oldOffsetAmount1: '',
    oldOffset2: '',
    oldOffsetAmount2: '',
    purchaseMaterial: '',
    purchaseAmount: '',
    actualLaborFee: '',
    actualGoldWeight: '',
    totalAmount: '',
  })

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.totalAmount) {
      toast.error('请填写实付合计')
      return
    }
    if (!confirm('提交结算单？提交后订单状态将变为"已完成"。')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '提交失败')
        return
      }
      toast.success('结算单已提交')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function RowInput({ label, fieldKey, placeholder }: { label: string; fieldKey: string; placeholder?: string }) {
    return (
      <div className="grid grid-cols-3 gap-2 items-center">
        <Label className="text-xs text-gray-600 col-span-1">{label}</Label>
        <Input
          className="h-8 text-sm col-span-2"
          value={(form as Record<string, string>)[fieldKey]}
          onChange={(e) => set(fieldKey, e.target.value)}
          placeholder={placeholder}
          type="number"
        />
      </div>
    )
  }

  return (
    <Card className="shadow-none border-primary/20 mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-sm text-primary">填写交货回单</CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">出货金料</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">材质</Label>
              <Input className="h-8 text-sm col-span-2" value={form.goldMaterial} onChange={(e) => set('goldMaterial', e.target.value)} placeholder="如：18K白金" />
            </div>
            <RowInput label="损耗(g)" fieldKey="goldLoss" />
            <RowInput label="重量(g)" fieldKey="goldWeight" />
            <RowInput label="单价(元/g)" fieldKey="goldUnitPrice" />
            <RowInput label="金额(元)" fieldKey="goldAmount" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-500">配石1</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">材质</Label>
              <Input className="h-8 text-sm col-span-2" value={form.stone1Material} onChange={(e) => set('stone1Material', e.target.value)} placeholder="石种" />
            </div>
            <RowInput label="重量" fieldKey="stone1Weight" />
            <RowInput label="单价(元)" fieldKey="stone1Price" />
            <RowInput label="金额(元)" fieldKey="stone1Amount" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-500">配石2</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">材质</Label>
              <Input className="h-8 text-sm col-span-2" value={form.stone2Material} onChange={(e) => set('stone2Material', e.target.value)} placeholder="石种" />
            </div>
            <RowInput label="重量" fieldKey="stone2Weight" />
            <RowInput label="单价(元)" fieldKey="stone2Price" />
            <RowInput label="金额(元)" fieldKey="stone2Amount" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-500">旧料抵</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">说明</Label>
              <Input className="h-8 text-sm col-span-2" value={form.oldOffset1} onChange={(e) => set('oldOffset1', e.target.value)} placeholder="旧料描述" />
            </div>
            <RowInput label="金额(元)" fieldKey="oldOffsetAmount1" />
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">说明2</Label>
              <Input className="h-8 text-sm col-span-2" value={form.oldOffset2} onChange={(e) => set('oldOffset2', e.target.value)} placeholder="旧料描述" />
            </div>
            <RowInput label="金额(元)" fieldKey="oldOffsetAmount2" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-500">买料</div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs text-gray-600">说明</Label>
              <Input className="h-8 text-sm col-span-2" value={form.purchaseMaterial} onChange={(e) => set('purchaseMaterial', e.target.value)} placeholder="买料说明" />
            </div>
            <RowInput label="金额(元)" fieldKey="purchaseAmount" />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-medium text-gray-500">汇总</div>
            <RowInput label="实际工费(元)" fieldKey="actualLaborFee" />
            <RowInput label="实际金重(g)" fieldKey="actualGoldWeight" />
            <div className="grid grid-cols-3 gap-2 items-center">
              <Label className="text-xs font-semibold text-primary">实付合计 *</Label>
              <Input className="h-9 text-sm col-span-2 border-primary/30 font-semibold" value={form.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} placeholder="¥ 0" type="number" />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 h-11 mt-2"
          >
            {loading ? '提交中...' : '提交结算单'}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
