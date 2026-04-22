import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canDecryptRecycleId, canReadRecycleRecords } from '@/lib/roles'
import { getRecord, getStore, listItemsForRecord } from '@/lib/recycle-db'
import { maskIdNumber, safeDecryptField } from '@/lib/encryption'
import { getSignedUrl } from '@/lib/cos'
import { Printer, AlertTriangle } from 'lucide-react'

type Params = { params: Promise<{ id: string }> }

export default async function RecycleDetailPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canReadRecycleRecords(session.role)) redirect('/dashboard')

  const { id } = await params
  const record = getRecord(Number(id))
  if (!record) notFound()
  const store = getStore(record.storeId)
  const items = listItemsForRecord(record.id)

  let idNumber = `***${'*'.repeat(11)}${record.idNumberLast4}`
  if (canDecryptRecycleId(session.role)) {
    const r = safeDecryptField(record.idNumberEncrypted)
    if (r.ok) idNumber = maskIdNumber(r.value) + `（明文：${r.value}）`
  }

  function sign(p: string | null): string | null {
    if (!p) return null
    try {
      return getSignedUrl(p, 300)
    } catch {
      return null
    }
  }

  const frontUrl = sign(record.idFrontPath)
  const backUrl = sign(record.idBackPath)
  const signatureUrl = sign(record.signaturePath)
  const bankcardUrl = sign(record.bankCardPath)

  const paymentLabel = formatPaymentMethod(
    record.paymentMethod,
    record.paymentOtherDesc
  )

  // 银行卡号显示：默认后 4 位，仅 boss 可见明文
  let bankCardDisplay: string | null = null
  if (record.paymentMethod === 'bank') {
    if (record.bankCardLast4) {
      bankCardDisplay = `**** **** **** ${record.bankCardLast4}`
    }
    if (canDecryptRecycleId(session.role) && record.bankCardEncrypted) {
      const r = safeDecryptField(record.bankCardEncrypted)
      if (r.ok) {
        const grouped = r.value.replace(/(.{4})/g, '$1 ').trim()
        bankCardDisplay = `${bankCardDisplay ?? ''}（明文：${grouped}）`
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 font-mono">{record.recordNo}</div>
          <h2 className="text-base font-medium text-gray-900 mt-0.5 inline-flex items-center gap-2">
            {record.customerName}
            {!record.idBackPath && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-normal bg-amber-100 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                反面缺失
              </span>
            )}
          </h2>
        </div>
        <Link
          href={`/recycle/${record.id}/receipt`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white text-sm px-3 py-1.5 hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" /> 打印客户联
        </Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
        <Row k="日期" v={record.recordDate} />
        <Row k="门店" v={store ? `${store.name}（${store.shortName}）` : '—'} />
        <Row k="身份证" v={idNumber} mono />
        <Row k="手机号" v={record.phone} mono />
        {record.remarks && <Row k="备注" v={record.remarks} />}
        {paymentLabel && <Row k="付款方式" v={paymentLabel} />}
        {record.paymentMethod === 'bank' && record.bankName && (
          <Row k="银行" v={record.bankName} />
        )}
        {record.paymentMethod === 'bank' && bankCardDisplay && (
          <Row k="银行卡号" v={bankCardDisplay} mono />
        )}
        <Row
          k="登记人"
          v={
            record.operatorDisplayName
              ? `${record.operatorDisplayName}（账号：${record.operatorName}）`
              : record.operatorName
          }
        />
        <Row k="录入时间" v={record.createdAt} />
        <Row k="状态" v={record.status} />
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">回收明细</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left font-normal py-1">成色</th>
              <th className="text-right font-normal py-1">重量(g)</th>
              <th className="text-right font-normal py-1">单价</th>
              <th className="text-right font-normal py-1">金额</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-gray-100">
                <td className="py-1.5">{formatMaterialPurity(it.material, it.purity)}</td>
                <td className="py-1.5 text-right font-mono">{it.weightG.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">{it.unitPrice.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">{it.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 text-sm font-medium">
              <td className="py-1.5">合计</td>
              <td className="py-1.5 text-right font-mono">{record.totalWeight.toFixed(2)}</td>
              <td></td>
              <td className="py-1.5 text-right font-mono">¥{record.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">附件</h3>
        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot label="身份证正面" url={frontUrl} />
          <PhotoSlot label="身份证背面" url={backUrl} />
          <PhotoSlot label="客户签名" url={signatureUrl} />
          {record.paymentMethod === 'bank' && (
            <PhotoSlot label="银行卡" url={bankcardUrl} />
          )}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          附件通过短时签名 URL 访问，每次刷新重新生成，勿截屏转发。
        </p>
      </section>
    </div>
  )
}

/**
 * 显示用拼接："足金 99.20%"。
 * 兼容旧数据：material 为空时直接显示 purity 原值（如 "足金999"）；
 * purity 能解析成数字时追加 %，否则原样输出。
 */
function formatMaterialPurity(material: string, purity: string): string {
  const pn = Number(purity)
  const pStr = purity && Number.isFinite(pn) ? `${pn.toFixed(2)}%` : purity
  if (!material) return pStr || '—'
  return pStr ? `${material} ${pStr}` : material
}

const PAYMENT_LABELS: Record<string, string> = {
  bank: '银行卡',
  alipay: '支付宝',
  wechat: '微信',
  other: '其他',
}

function formatPaymentMethod(method: string, otherDesc: string): string {
  if (!method) return ''
  const base = PAYMENT_LABELS[method] ?? method
  if (method === 'other' && otherDesc) return `${base}（${otherDesc}）`
  return base
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-gray-400 shrink-0">{k}</span>
      <span className={`text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  )
}

function PhotoSlot({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="w-full aspect-[3/2] object-cover rounded-md border border-gray-200 bg-gray-50"
          />
        </a>
      ) : (
        <div className="w-full aspect-[3/2] rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
          未上传
        </div>
      )}
    </div>
  )
}
