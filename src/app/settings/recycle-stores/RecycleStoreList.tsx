'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

type Store = { id: number; name: string; shortName: string; address: string; phone: string }

export function RecycleStoreList({ initial }: { initial: Store[] }) {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', shortName: '', address: '', phone: '' })
  const [loading, setLoading] = useState(false)

  function openNew() {
    setForm({ name: '', shortName: '', address: '', phone: '' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/recycle/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '新增失败')
        return
      }
      toast.success('门店已创建')
      setStores((prev) => [...prev, data as Store])
      setShowForm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">{stores.length} 个门店</h2>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="w-4 h-4" /> 添加
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">新建门店</span>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">门店名称 *</Label>
                  <Input
                    className="h-9 text-sm mt-1"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">简称 *</Label>
                  <Input
                    className="h-9 text-sm mt-1 font-mono"
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                    placeholder="例：MX"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">地址</Label>
                <Input
                  className="h-9 text-sm mt-1"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">电话</Label>
                <Input
                  className="h-9 text-sm mt-1"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {stores.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            暂无门店，点击右上角「添加」创建第一个
          </div>
        )}
        {stores.map((store) => (
          <Card key={store.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{store.name}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
                    {store.shortName}
                  </span>
                </div>
                {(store.address || store.phone) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {store.address}
                    {store.address && store.phone ? ' · ' : ''}
                    {store.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
