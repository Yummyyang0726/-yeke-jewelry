'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

type Store = { id: number; name: string; shortName: string; address: string; phone: string }

export function StoreList({ initialStores, canEdit }: { initialStores: Store[]; canEdit: boolean }) {
  const router = useRouter()
  const [stores, setStores] = useState(initialStores)
  const [editing, setEditing] = useState<Store | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', shortName: '', address: '', phone: '' })
  const [loading, setLoading] = useState(false)

  function openNew() {
    setEditing(null)
    setForm({ name: '', shortName: '', address: '', phone: '' })
    setShowForm(true)
  }

  function openEdit(store: Store) {
    setEditing(store)
    setForm({ name: store.name, shortName: store.shortName, address: store.address, phone: store.phone })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = editing ? `/api/stores/${editing.id}` : '/api/stores'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success(editing ? '门店已更新' : '门店已创建')
      setShowForm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(store: Store) {
    if (!confirm(`确定删除门店「${store.name}」？`)) return
    const res = await fetch(`/api/stores/${store.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '删除失败')
      return
    }
    toast.success('已删除')
    setStores((prev) => prev.filter((s) => s.id !== store.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">{stores.length} 个门店</h2>
        {canEdit && (
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="w-4 h-4" /> 添加
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">{editing ? '编辑门店' : '新建门店'}</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">门店名称 *</Label>
                  <Input className="h-9 text-sm mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-xs">简称 *</Label>
                  <Input className="h-9 text-sm mt-1" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label className="text-xs">地址</Label>
                <Input className="h-9 text-sm mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">电话</Label>
                <Input className="h-9 text-sm mt-1" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {stores.map((store) => (
          <Card key={store.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{store.name}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{store.shortName}</span>
                </div>
                {(store.address || store.phone) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {store.address}{store.address && store.phone ? ' · ' : ''}{store.phone}
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(store)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(store)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
