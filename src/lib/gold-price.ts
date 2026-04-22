/**
 * 金价获取服务 - 移植自 gold-price-server
 * 多源获取 + 降级到手动价格
 */

const MANUAL_PRICES = {
  gold: 1388,
  platinum: 580,
  recycleGold: 1032,
  recyclePlatinum: 399,
}

export type PriceData = {
  gold: number
  platinum: number
  recycleGold: number
  recyclePlatinum: number
  updateTime: string
  source: 'api' | 'manual'
}

// In-memory cache
let cachedPrices: PriceData = {
  ...MANUAL_PRICES,
  updateTime: new Date().toISOString(),
  source: 'manual',
}

async function fetchJisuData(): Promise<{ gold: number; platinum: number } | null> {
  try {
    const res = await fetch(
      'https://api.jisuapi.com/gold/storegold?appkey=acb90157238028e9',
      { signal: AbortSignal.timeout(10000) },
    )
    const data = await res.json()
    if (data.status !== 0) return null
    const brand = data.result?.list?.find(
      (item: { gold: string }) => item.gold && parseFloat(item.gold) > 0,
    )
    if (!brand) return null
    return { gold: parseFloat(brand.gold), platinum: parseFloat(brand.platinum) || 0 }
  } catch {
    return null
  }
}

export async function refreshPrices(): Promise<PriceData> {
  const jisuData = await fetchJisuData()

  if (jisuData) {
    cachedPrices = {
      gold: jisuData.gold,
      platinum: jisuData.platinum,
      recycleGold: cachedPrices.recycleGold,
      recyclePlatinum: cachedPrices.recyclePlatinum,
      updateTime: new Date().toISOString(),
      source: 'api',
    }
  } else {
    cachedPrices = {
      ...MANUAL_PRICES,
      updateTime: new Date().toISOString(),
      source: 'manual',
    }
  }

  return cachedPrices
}

export function getCachedPrices(): PriceData {
  return cachedPrices
}
