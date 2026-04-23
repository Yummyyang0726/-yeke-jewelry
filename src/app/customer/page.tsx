import Image from 'next/image'
import { listStores } from '@/lib/recycle-db'
import { CustomerForm } from './CustomerForm'

export default function CustomerPage() {
  const stores = listStores()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        <div className="flex flex-col items-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="叶客金匠"
            width={64}
            height={64}
            className="rounded-xl mb-3"
          />
          <h1 className="text-lg font-semibold text-gray-900">叶客金匠</h1>
          <p className="text-sm text-gray-500 mt-0.5">旧金回购 · 客户自助登记</p>
        </div>
        <CustomerForm stores={stores.map((s) => ({ id: s.id, name: s.name }))} />
      </div>
    </div>
  )
}
