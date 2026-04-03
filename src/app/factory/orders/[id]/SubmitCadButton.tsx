'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ImageUp } from 'lucide-react'

export function SubmitCadButton({ orderId }: { orderId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmitCad() {
    if (!confirm('提交CAD图，等待门店确认？（图片上传功能即将上线，当前先提交状态）')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: 'CAD待确认', note: '工厂提交CAD图' }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success('CAD图已提交，等待门店确认')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSubmitCad}
      disabled={loading}
      className="w-full mb-4 bg-amber-700 hover:bg-amber-800 h-11 gap-2"
    >
      <ImageUp className="w-4 h-4" />
      {loading ? '提交中...' : '提交CAD图'}
    </Button>
  )
}
