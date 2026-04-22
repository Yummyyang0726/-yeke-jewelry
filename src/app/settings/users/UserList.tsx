'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

type User = {
  id: number
  name: string
  phone: string
  role: string
  factoryId: number | null
  factoryName: string | null
}

type Factory = { id: number; name: string }

type Props = {
  initialUsers: User[]
  factories: Factory[]
  currentUserId: number
}

const ROLE_LABELS: Record<string, string> = {
  boss: '管理员',
  employee: '员工',
  factory: '工厂',
}

export function UserList({ initialUsers, factories, currentUserId }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [editing, setEditing] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'employee', factoryId: '' })
  const [loading, setLoading] = useState(false)

  function openNew() {
    setEditing(null)
    setForm({ name: '', phone: '', password: '', role: 'employee', factoryId: '' })
    setShowForm(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setForm({
      name: user.name,
      phone: user.phone,
      password: '',
      role: user.role,
      factoryId: user.factoryId?.toString() ?? '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
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
      toast.success(editing ? '用户已更新' : '用户已创建')
      setShowForm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`确定删除用户 ${user.name}？`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '删除失败')
      return
    }
    toast.success('已删除')
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">{users.length} 个用户</h2>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="w-4 h-4" /> 添加用户
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">{editing ? '编辑用户' : '新建用户'}</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">姓名 *</Label>
                  <Input className="h-9 text-sm mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label className="text-xs">手机号 *</Label>
                  <Input className="h-9 text-sm mt-1" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label className="text-xs">{editing ? '密码（留空不修改）' : '密码 *'}</Label>
                <Input className="h-9 text-sm mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
              </div>
              <div>
                <Label className="text-xs">角色 *</Label>
                <select
                  className="w-full h-9 text-sm mt-1 rounded-md border border-border bg-white px-3"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="boss">管理员</option>
                  <option value="employee">员工</option>
                  <option value="factory">工厂</option>
                </select>
              </div>
              {form.role === 'factory' && (
                <div>
                  <Label className="text-xs">关联工厂 *</Label>
                  <select
                    className="w-full h-9 text-sm mt-1 rounded-md border border-border bg-white px-3"
                    value={form.factoryId}
                    onChange={(e) => setForm({ ...form, factoryId: e.target.value })}
                    required
                  >
                    <option value="">选择工厂</option>
                    {factories.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{user.name}</span>
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {user.phone}
                  {user.factoryName && <span className="ml-2">· {user.factoryName}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(user)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                {user.id !== currentUserId && (
                  <button onClick={() => handleDelete(user)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
