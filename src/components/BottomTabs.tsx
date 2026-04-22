'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList,
  Scale,
  BarChart3,
  Settings,
} from 'lucide-react'

type Tab = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (path: string) => boolean
}

const TABS: Tab[] = [
  {
    label: '订单',
    href: '/dashboard',
    icon: ClipboardList,
    match: (p) => p === '/dashboard' || p.startsWith('/orders') || p.startsWith('/factory'),
  },
  {
    label: '对账',
    href: '/reconciliation',
    icon: Scale,
    match: (p) => p.startsWith('/reconciliation'),
  },
  {
    label: '报表',
    href: '/reports',
    icon: BarChart3,
    match: (p) => p.startsWith('/reports'),
  },
  {
    label: '设置',
    href: '/settings',
    icon: Settings,
    match: (p) => p.startsWith('/settings'),
  },
]

export function BottomTabs({ role }: { role: string }) {
  const pathname = usePathname()

  const visibleTabs = TABS.filter((tab) => {
    if (role === 'factory') {
      return tab.label === '订单' || tab.label === '设置'
    }
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-bottom">
      <div className="max-w-2xl mx-auto flex">
        {visibleTabs.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 text-xs transition-colors
                ${active
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
