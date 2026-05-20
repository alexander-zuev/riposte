/**
 * RFC 9562 UUIDv7: 48-bit Unix-ms timestamp + version (0b0111) + 12 bits rand_a
 * + variant (0b10) + 62 bits rand_b. Time-ordered: lexicographic sort matches
 * creation order, which keeps B-tree PK inserts at the right edge of the index.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16)

  const ts = Date.now()
  const high = Math.floor(ts / 0x100000000)
  const low = ts >>> 0
  bytes[0] = (high >>> 8) & 0xff
  bytes[1] = high & 0xff
  bytes[2] = (low >>> 24) & 0xff
  bytes[3] = (low >>> 16) & 0xff
  bytes[4] = (low >>> 8) & 0xff
  bytes[5] = low & 0xff

  crypto.getRandomValues(bytes.subarray(6, 16))

  bytes[6] = (bytes[6]! & 0x0f) | 0x70
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const h: string[] = []
  for (let i = 0; i < 16; i++) h.push(bytes[i]!.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
}
