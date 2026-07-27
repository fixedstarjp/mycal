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
  const bg = [10, 10, 11] // マットブラック
  const fg = [212, 175, 55] // ゴールド
  const rows = []
  const cx = size / 2
  const cy = size / 2
  // ダンベル: 中央のバー + 内側プレート(2枚) + 外側プレート(2枚)
  const inDumbbell = (x, y) => {
    const u = Math.abs(x - cx) / size // 中心からの横距離(0-0.5)
    const v = Math.abs(y - cy) / size // 中心からの縦距離(0-0.5)
    if (u < 0.22 && v < 0.045) return true // バー
    if (u >= 0.22 && u < 0.3 && v < 0.22) return true // 内側プレート
    if (u >= 0.33 && u < 0.39 && v < 0.13) return true // 外側プレート
    return false
  }
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      const [r, g, b] = inDumbbell(x, y) ? fg : bg
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
