import crypto from 'node:crypto'

/**
 * 字段级加密工具 - 用于保护敏感 PII（如身份证号）
 *
 * 算法：AES-256-GCM（鉴权加密，防篡改）
 * 密钥：process.env.FIELD_ENCRYPTION_KEY（32 字节 base64）
 *   生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * ⚠️ 密钥丢失 = 已加密数据永久不可恢复。部署前请妥善备份。
 *
 * 存储格式：`base64(iv):base64(authTag):base64(ciphertext)`（冒号分隔三段）
 */

const ALGO = 'aes-256-gcm'
const IV_LEN = 12 // GCM 推荐 12 字节
const KEY_LEN = 32

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY is not set. Generate one with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes, got ${buf.length}`
    )
  }
  cachedKey = buf
  return buf
}

export function encryptField(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptField: plaintext must be a non-empty string')
  }
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('decryptField: invalid ciphertext format (expected 3 parts)')
  }
  const [ivB64, tagB64, ctB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  if (iv.length !== IV_LEN) {
    throw new Error('decryptField: invalid IV length')
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}

export function safeDecryptField(
  ciphertext: string | null | undefined
): { ok: true; value: string } | { ok: false } {
  if (!ciphertext) return { ok: false }
  try {
    return { ok: true, value: decryptField(ciphertext) }
  } catch {
    return { ok: false }
  }
}

/**
 * 身份证号脱敏显示
 * 18 位：保留前 3 位 + 后 4 位，中间 11 位用 * 替换
 * 15 位：保留前 3 位 + 后 4 位，中间 8 位用 * 替换
 * 其他长度：保留前 3 位 + 后 4 位，中间全部替换
 */
export function maskIdNumber(plain: string): string {
  if (!plain) return ''
  const s = plain.trim()
  if (s.length <= 7) return '*'.repeat(s.length)
  const head = s.slice(0, 3)
  const tail = s.slice(-4)
  const mid = '*'.repeat(s.length - 7)
  return head + mid + tail
}

/**
 * 根据 18 位身份证号出生日期（第 7-14 位）判断是否未满 18 周岁
 * 15 位身份证号（第 7-12 位 YYMMDD，70 年代以后）按 19YY 处理
 * 非法输入返回 false（不拦截，由前端校验兜底）
 */
export function computeIsMinor(idNumber: string, refDate: Date = new Date()): boolean {
  if (!idNumber) return false
  const s = idNumber.trim()
  let y: number
  let m: number
  let d: number
  if (/^\d{17}[\dXx]$/.test(s)) {
    y = Number(s.slice(6, 10))
    m = Number(s.slice(10, 12))
    d = Number(s.slice(12, 14))
  } else if (/^\d{15}$/.test(s)) {
    y = 1900 + Number(s.slice(6, 8))
    m = Number(s.slice(8, 10))
    d = Number(s.slice(10, 12))
  } else {
    return false
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const birth = new Date(y, m - 1, d)
  if (isNaN(birth.getTime())) return false
  const eighteenth = new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate())
  return refDate < eighteenth
}

/** 提取身份证后 4 位（用于搜索索引）；非法长度返回空串 */
export function extractIdLast4(idNumber: string): string {
  if (!idNumber) return ''
  const s = idNumber.trim()
  if (s.length < 4) return ''
  return s.slice(-4)
}
