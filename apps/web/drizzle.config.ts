import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env' })

const env = process.env.DRIZZLE_ENV || 'dev'

if (!['dev', 'prod'].includes(env)) {
  throw new Error(`Invalid DRIZZLE_ENV: ${env}. Must be one of: dev, prod`)
}
console.log(`\n🗄️  Drizzle running against: ${env.toUpperCase()}\n`)

const dbUrl = {
  dev: process.env.DATABASE_URL_DEV!,
  prod: process.env.DATABASE_URL_PROD!,
}[env as 'dev' | 'prod']

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/infrastructure/db/schema',
  out: './src/server/infrastructure/db/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: dbUrl,
  },
  strict: true,
  verbose: true,
})
