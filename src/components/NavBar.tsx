'use client'

import { useRouter } from 'next/navigation'

type Props = {
  userName: string
  role: string
  title?: string
}

export function NavBar({ userName, role, title }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const roleLabel =
    role === 'boss' ? '管理员' : role === 'employee' ? '员工' : '工厂'

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide text-foreground">
            {title ?? '叶客金匠'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {userName}
            <span className="ml-1 text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  )
}
