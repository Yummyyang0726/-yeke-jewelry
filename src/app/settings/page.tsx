import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Factory, Store, ChevronRight, Coins } from 'lucide-react'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isBoss = session.role === 'boss'
  const canRecycle = session.role === 'boss' || session.role === 'employee'

  const items = [
    ...(isBoss
      ? [{ label: '用户管理', desc: '管理账号和权限', href: '/settings/users', icon: Users }]
      : []),
    { label: '工厂管理', desc: '工厂信息和对账设置', href: '/settings/factories', icon: Factory },
    { label: '门店管理', desc: '门店基本信息', href: '/settings/stores', icon: Store },
    ...(canRecycle
      ? [
          {
            label: '旧金回购登记',
            desc: isBoss ? '查询、导出、新建回购记录' : '柜台录入客户信息',
            href: isBoss ? '/recycle' : '/recycle/new',
            icon: Coins,
          },
        ]
      : []),
    ...(isBoss
      ? [
          {
            label: '回购门店台账',
            desc: '管理回购单据编号前缀',
            href: '/settings/recycle-stores',
            icon: Store,
          },
        ]
      : []),
  ]

  return (
    <AppShell userName={session.name} role={session.role} title="设置">
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
