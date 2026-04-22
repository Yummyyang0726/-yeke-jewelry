// eslint-disable-next-line @typescript-eslint/no-require-imports
const COS = require('cos-nodejs-sdk-v5')

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
})

const Bucket = process.env.COS_BUCKET!
const Region = process.env.COS_REGION!

/**
 * Upload a file buffer to COS as PUBLIC-READ (convenience for non-sensitive assets).
 * Returns the public URL of the uploaded file.
 *
 * ✅ Use for: 订单参考图 / 材料图 / CAD / 出库单图片（可公开浏览的业务附件）
 * ❌ DO NOT USE for: 身份证照片、签名、任何 PII — use uploadPrivateToCOS instead.
 */
export async function uploadToCOS(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await cos.putObject({
    Bucket,
    Region,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  })

  // Return the COS URL
  return `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`
}

/**
 * Upload a file buffer to COS with PRIVATE ACL. Returns the key (NOT a URL).
 * Callers should persist the key and render via getSignedUrl() with a short TTL.
 *
 * ✅ Use for: 身份证正反面、电子签名、任何含 PII 的图像
 */
export async function uploadPrivateToCOS(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await cos.putObject({
    Bucket,
    Region,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private',
  })
  return key
}

/**
 * Delete a file from COS
 */
export async function deleteFromCOS(key: string): Promise<void> {
  await cos.deleteObject({
    Bucket,
    Region,
    Key: key,
  })
}

/**
 * Extract the COS key from a full URL
 */
export function getCOSKeyFromUrl(url: string): string | null {
  const prefix = `https://${Bucket}.cos.${Region}.myqcloud.com/`
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length)
  }
  // Also handle signed URLs (key is in the path before ?)
  try {
    const u = new URL(url)
    if (u.hostname.includes(Bucket)) {
      return u.pathname.slice(1) // remove leading /
    }
  } catch {
    // not a URL
  }
  return null
}

/**
 * Generate a signed URL for private read access
 * Default expiry: 1 hour (3600 seconds)
 */
export function getSignedUrl(key: string, expires = 3600): string {
  return cos.getObjectUrl({
    Bucket,
    Region,
    Key: key,
    Sign: true,
    Expires: expires,
  }, () => {})
}
