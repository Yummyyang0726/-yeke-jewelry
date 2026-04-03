'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

export function PickupButton({ orderId }: { orderId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePickup() {
    if (!confirm('确认客户已取件？')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: '已取件', note: '客户取件' }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success('已标记取件完成')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePickup}
      disabled={loading}
      className="w-full mb-4 bg-green-600 hover:bg-green-700 h-11 gap-2"
    >
      <Package className="w-4 h-4" />
      {loading ? '处理中...' : '标记已取件'}
    </Button>
  )
}
