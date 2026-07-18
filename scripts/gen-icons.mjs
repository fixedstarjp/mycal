// PWA用のプレースホルダアイコン(単色+「M」風の簡易図形)をPNGで生成する。
// 依存パッケージなし(zlibのみ)。npm run gen:icons で実行。
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makePng(size) {
  const bg = [30, 41, 59] // slate-800
  const fg = [56, 189, 248] // sky-400
  const rows = []
  const cx = size / 2
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      // 「M」を模した2本のV字ストローク
      const u = (x - cx) / (size * 0.32)
      const v = (y - size * 0.3) / (size * 0.45)
      const inM =
        v >= 0 &&
        v <= 1 &&
        (Math.abs(Math.abs(u) - (1 - v) * 0.9) < 0.16 || (Math.abs(u) > 0.75 && Math.abs(u) < 1.05))
      const [r, g, b] = inM ? fg : bg
      row[1 + x * 3] = r
      row[1 + x * 3 + 1] = g
      row[1 + x * 3 + 2] = b
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/pwa-${size}.png`, import.meta.url), makePng(size))
  console.log(`public/pwa-${size}.png generated`)
}
