/**
 * 百度智能云 身份证 OCR 封装。
 *
 * 为什么不用腾讯云：
 *  - 百度云身份证识别免费额度 500 次/日（≈ 15000/月），远高于腾讯云 1000/月
 *  - 我们 3 家店月单量预估 1500 单，百度额度 5 年用不完
 *  - 准确率两家相当
 *
 * 环境变量：
 *   BAIDU_OCR_API_KEY
 *   BAIDU_OCR_SECRET_KEY
 *
 * 官方 API 文档：https://ai.baidu.com/ai-doc/OCR/rk3h7xzck
 */

type OcrResult = {
  name: string
  idNumber: string
  sex?: string
  nation?: string
  birth?: string // 百度返回 "YYYYMMDD" 格式（无分隔符）
  address?: string
}

type BaiduIdCardResponse = {
  log_id?: number
  words_result_num?: number
  image_status?: string // normal / reversed_side / non_idcard / blurred / other_type_card / over_exposure / unknown
  words_result?: {
    姓名?: { words: string }
    性别?: { words: string }
    民族?: { words: string }
    出生?: { words: string }
    住址?: { words: string }
    公民身份号码?: { words: string }
  }
  error_code?: number
  error_msg?: string
}

// ===== access_token 缓存 =====
// 百度 token 有效期 30 天，我们缓存到进程内存（重启失效无所谓，会重新拉）。
let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    // 还有 >1 分钟有效期，直接复用
    return tokenCache.token
  }
  const apiKey = process.env.BAIDU_OCR_API_KEY
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY
  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY 未配置')
  }
  const url =
    `https://aip.baidubce.com/oauth/2.0/token` +
    `?grant_type=client_credentials` +
    `&client_id=${encodeURIComponent(apiKey)}` +
    `&client_secret=${encodeURIComponent(secretKey)}`

  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`百度 token 请求失败：HTTP ${res.status}`)
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!data.access_token) {
    throw new Error(`百度 token 响应异常：${data.error || JSON.stringify(data)}`)
  }
  // expires_in 单位为秒，提前 5 分钟过期以防边界问题
  const ttlMs = Math.max(0, (data.expires_in || 2592000) - 300) * 1000
  tokenCache = { token: data.access_token, expiresAt: now + ttlMs }
  return data.access_token
}

/**
 * 识别身份证正面（人像面）。buffer 为原图字节。
 */
export async function recognizeIdFront(buffer: Buffer): Promise<OcrResult> {
  const token = await getAccessToken()
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${encodeURIComponent(token)}`
  const body = new URLSearchParams()
  body.set('id_card_side', 'front') // front = 人像面（有姓名+身份证号）
  body.set('image', buffer.toString('base64'))
  // detect_risk = true 可检测 PS/翻拍/临时证，默认不开（会多计费），按需打开

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`百度 OCR HTTP ${res.status}`)
  }
  const data = (await res.json()) as BaiduIdCardResponse

  if (data.error_code) {
    // token 过期兜底：清缓存下次重取
    if (data.error_code === 110 || data.error_code === 111) {
      tokenCache = null
    }
    throw new Error(`百度 OCR 错误 ${data.error_code}: ${data.error_msg}`)
  }

  // 图像状态检查：非人像面 / 非身份证 / 模糊等
  const status = data.image_status || 'unknown'
  if (status !== 'normal') {
    const hints: Record<string, string> = {
      reversed_side: '图片是身份证反面，请拍正面（人像面）',
      non_idcard: '图片不是身份证',
      blurred: '图片模糊，请重新拍摄',
      over_exposure: '图片过曝，请避开强光重拍',
      unknown: '图片无法识别',
    }
    throw new Error(hints[status] || `图片状态异常：${status}`)
  }

  const w = data.words_result || {}
  return {
    name: w['姓名']?.words || '',
    idNumber: w['公民身份号码']?.words || '',
    sex: w['性别']?.words,
    nation: w['民族']?.words,
    birth: w['出生']?.words,
    address: w['住址']?.words,
  }
}
