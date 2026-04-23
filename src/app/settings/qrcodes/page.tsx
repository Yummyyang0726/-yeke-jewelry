import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import QRCode from 'qrcode'

const CUSTOMER_URL = 'https://recycle.yekegoldsmith.store/customer'

export default async function QRCodesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'boss') redirect('/dashboard')

  const dataUrl = await QRCode.toDataURL(CUSTOMER_URL, {
    width: 360,
    margin: 2,
    color: { dark: '#111827', light: '#ffffff' },
  })

  return (
    <AppShell userName={session.name} role={session.role} title="客户自助二维码" hideBottomTabs>
      <div className="flex flex-col items-center gap-6 py-4">
        {/* QR 图片 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt="客户自助登记二维码"
          className="w-64 h-64 rounded-xl border border-gray-200 shadow-sm"
        />

        {/* 说明 */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-900">旧金回购 · 客户自助登记</p>
          <p className="text-xs text-gray-500">客户扫码后选择门店，填写姓名/身份证/手机号</p>
          <p className="mt-2 text-[11px] font-mono text-gray-400 break-all px-4">{CUSTOMER_URL}</p>
        </div>

        {/* 下载按钮 */}
        <a
          href={dataUrl}
          download="叶客金匠-客户自助登记二维码.png"
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white text-sm px-5 py-2.5 hover:bg-gray-700"
        >
          下载 PNG
        </a>

        {/* 使用提示 */}
        <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500 space-y-1.5">
          <p className="font-medium text-gray-700">使用说明</p>
          <p>1. 打印此二维码，贴在门店收银台或展示区</p>
          <p>2. 客户扫码 → 选择门店 → 填写信息 → 提交</p>
          <p>3. 员工在"回购列表"顶部看到"待处理"提醒，点击补填金料明细</p>
        </div>
      </div>
    </AppShell>
  )
}
