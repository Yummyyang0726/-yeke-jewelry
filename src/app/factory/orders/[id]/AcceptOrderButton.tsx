'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ClipboardCheck } from 'lucide-react'

export function AcceptOrderButton({ orderId }: { orderId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: '待出图', note: '工厂确认接单' }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success('已接单，请上传CAD图')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAccept}
      disabled={loading}
      className="w-full mb-4 bg-primary hover:bg-primary/90 h-11 gap-2"
    >
      <ClipboardCheck className="w-4 h-4" />
      {loading ? '处理中...' : '确认接单'}
    </Button>
  )
}
