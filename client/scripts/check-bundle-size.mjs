#!/usr/bin/env node
// Production bundle budget: total gzip size of everything the browser downloads from dist/
// (JS, CSS, HTML, SVG…) must stay within the limit from the assignment (≤ 200 KB gzip).
// Usage: node scripts/check-bundle-size.mjs [distDir] [limitKb]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = process.argv[2] ?? 'dist'
const limitKb = Number(process.argv[3] ?? process.env.BUNDLE_LIMIT_KB ?? 200)
const COMPRESSIBLE = /\.(js|mjs|css|html|svg|json|txt|webmanifest)$/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

let files
try {
  files = [...walk(distDir)]
} catch {
  console.error(`[bundle-size] "${distDir}" not found — run "npm run build" first`)
  process.exit(1)
}

const rows = files.map((path) => {
  const content = readFileSync(path)
  // Binary assets (images, fonts) are already compressed: counted as is.
  const bytes = COMPRESSIBLE.test(path) ? gzipSync(content, { level: 9 }).length : content.length
  return { file: relative(distDir, path), kb: bytes / 1024 }
})

const totalKb = rows.reduce((sum, row) => sum + row.kb, 0)
for (const row of rows.sort((a, b) => b.kb - a.kb)) console.log(`${row.kb.toFixed(2).padStart(9)} KB  ${row.file}`)
console.log(`${totalKb.toFixed(2).padStart(9)} KB  total (gzip), limit ${limitKb} KB`)

if (totalKb > limitKb) {
  console.error(`[bundle-size] budget exceeded by ${(totalKb - limitKb).toFixed(2)} KB`)
  process.exit(1)
}
