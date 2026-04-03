'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
  userName: string
  role: string
}

export function NavBar({ userName, role }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isStore = role === 'boss' || role === 'employee'

  return (
    <header className="sticky top-0 z-50 bg-amber-700 text-white shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href={isStore ? '/dashboard' : '/factory'} className="font-bold text-lg tracking-wide">
          叶客金匠
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-80">{userName}</span>
          <button
            onClick={handleLogout}
            className="opacity-80 hover:opacity-100 underline underline-offset-2"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  )
}
