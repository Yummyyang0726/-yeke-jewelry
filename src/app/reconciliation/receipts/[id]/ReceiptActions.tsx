'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ReceiptActions({ receiptId }: { receiptId: number }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('确定要删除此收料单吗？此操作不可恢复。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reconciliation/receipts/${receiptId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '删除失败')
        return
      }
      toast.success('收料单已删除')
      router.push('/reconciliation/receipts')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? '删除中...' : '删除收料单'}
    </Button>
  )
}
