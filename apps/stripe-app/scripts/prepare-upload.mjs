import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [manifestArg, outputArg] = process.argv.slice(2)

if (!manifestArg || !outputArg) {
  console.error('Usage: node scripts/prepare-upload.mjs <manifest> <output-dir>')
  process.exit(1)
}

const outputDir = resolve(appRoot, outputArg)
const manifest = await readManifest(resolve(appRoot, manifestArg))

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })

await Promise.all([
  cp(join(appRoot, 'src'), join(outputDir, 'src'), { recursive: true }),
  cp(join(appRoot, 'riposte_icon_512.png'), join(outputDir, 'riposte_icon_512.png')),
  cp(join(appRoot, 'package.json'), join(outputDir, 'package.json')),
  cp(join(appRoot, 'package-lock.json'), join(outputDir, 'package-lock.json')),
  cp(join(appRoot, 'tsconfig.json'), join(outputDir, 'tsconfig.json')),
])

await writeFile(join(outputDir, 'stripe-app.json'), `${JSON.stringify(manifest, null, 2)}\n`)

async function readManifest(path) {
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  if (!manifest.extends) return manifest

  const parent = await readManifest(resolve(dirname(path), manifest.extends))
  const { extends: _extends, ...overrides } = manifest
  return merge(parent, overrides)
}

function merge(base, overrides) {
  if (Array.isArray(base) || Array.isArray(overrides)) return overrides
  if (!isPlainObject(base) || !isPlainObject(overrides)) return overrides

  const merged = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = key in merged ? merge(merged[key], value) : value
  }
  return merged
}

function isPlainObject(value) {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  )
}
