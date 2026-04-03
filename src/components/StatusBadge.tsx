import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  待接单: { label: '待接单', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  待出图: { label: '待出图', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  CAD待确认: { label: 'CAD待确认', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  生产中: { label: '生产中', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  已完成: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
  已取件: { label: '已取件', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
