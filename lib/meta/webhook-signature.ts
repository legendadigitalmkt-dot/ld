import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyHmacSha256(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const providedHex = signatureHeader.slice('sha256='.length)

  if (!/^[a-f0-9]{64}$/i.test(providedHex)) return false
  const provided = Buffer.from(providedHex, 'hex')
  if (provided.length !== expected.length) return false

  return timingSafeEqual(expected, provided)
}
