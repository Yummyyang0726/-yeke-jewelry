'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function NoteActions({ noteId, paymentStatus }: { noteId: number; paymentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handlePayment(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/reconciliation/notes/${noteId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success(`已标记为${newStatus}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('确定要删除此出库单吗？此操作不可恢复。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reconciliation/notes/${noteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '删除失败')
        return
      }
      toast.success('出库单已删除')
      router.push('/reconciliation/notes')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {paymentStatus !== '已付' && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white h-10"
            onClick={() => handlePayment('已付')}
            disabled={loading}
          >
            标记已付
          </Button>
        )}
        {paymentStatus !== '未付' && (
          <Button
            variant="outline"
            className="h-10"
            onClick={() => handlePayment('未付')}
            disabled={loading}
          >
            标记未付
          </Button>
        )}
        {paymentStatus !== '部分付' && (
          <Button
            variant="outline"
            className="h-10 border-amber-300 text-amber-600 hover:bg-amber-50"
            onClick={() => handlePayment('部分付')}
            disabled={loading}
          >
            标记部分付
          </Button>
        )}
      </div>
      <Button
        variant="outline"
        className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? '删除中...' : '删除出库单'}
      </Button>
    </div>
  )
}
