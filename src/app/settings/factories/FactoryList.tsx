'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

type Factory = { id: number; name: string; noteTemplate?: string }

const ALL_MATERIALS = ['18K', '9K', 'PT950', 'PT900', '千足金', '24K足金']

function parseTemplate(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function FactoryList({ initialFactories, canEdit }: { initialFactories: Factory[]; canEdit: boolean }) {
  const router = useRouter()
  const [factories, setFactories] = useState(initialFactories)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTemplate, setEditTemplate] = useState<string[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/factories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '创建失败')
        return
      }
      toast.success('工厂已创建')
      setNewName('')
      setShowNew(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/factories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          noteTemplate: JSON.stringify(editTemplate),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '更新失败')
        return
      }
      toast.success('已更新')
      setEditingId(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(factory: Factory) {
    if (!confirm(`确定删除工厂「${factory.name}」？`)) return
    const res = await fetch(`/api/factories/${factory.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '删除失败')
      return
    }
    toast.success('已删除')
    setFactories((prev) => prev.filter((f) => f.id !== factory.id))
  }

  function toggleMaterial(m: string) {
    setEditTemplate((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">{factories.length} 个工厂</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
            <Plus className="w-4 h-4" /> 添加
          </Button>
        )}
      </div>

      {showNew && (
        <Card className="mb-3">
          <CardContent className="p-3 flex items-center gap-2">
            <Input
              className="h-9 text-sm flex-1"
              placeholder="工厂名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreate} disabled={loading}><Check className="w-4 h-4" /></Button>
            <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {factories.map((factory) => {
          const template = parseTemplate(factory.noteTemplate)
          const isEditing = editingId === factory.id
          return (
            <Card key={factory.id}>
              <CardContent className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-9 text-sm flex-1"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="工厂名称"
                        autoFocus
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1.5">出库单默认材质（勾选）</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_MATERIALS.map((m) => {
                          const on = editTemplate.includes(m)
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => toggleMaterial(m)}
                              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                on
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-foreground border-input hover:border-primary/40'
                              }`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">新建出库单时，自动预填这些材质的行</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-8 px-3 text-xs text-muted-foreground rounded-md hover:bg-secondary"
                      >
                        取消
                      </button>
                      <Button size="sm" onClick={() => handleUpdate(factory.id)} disabled={loading}>
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{factory.name}</div>
                      {template.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.map((m) => (
                            <span key={m} className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(factory.id)
                            setEditName(factory.name)
                            setEditTemplate(template)
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(factory)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
