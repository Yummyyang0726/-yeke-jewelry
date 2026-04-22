'use client'

import { NavBar } from './NavBar'
import { BottomTabs } from './BottomTabs'

type Props = {
  userName: string
  role: string
  title?: string
  children: React.ReactNode
  hideBottomTabs?: boolean
}

export function AppShell({ userName, role, title, children, hideBottomTabs }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userName={userName} role={role} title={title} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>
      {!hideBottomTabs && <BottomTabs role={role} />}
    </div>
  )
}
