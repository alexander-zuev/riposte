import { defineConfig } from 'drizzle-kit'
import { z } from 'zod'

const envSchema = z
  .object({
    DRIZZLE_ENV: z.enum(['dev', 'prod']).default('dev'),
    DATABASE_URL_DEV: z.string().min(1),
    DATABASE_URL_PROD: z.string().min(1),
  })
  .transform((val) => ({
    env: val.DRIZZLE_ENV,
    url: val.DRIZZLE_ENV === 'dev' ? val.DATABASE_URL_DEV : val.DATABASE_URL_PROD,
  }))

const { env, url } = envSchema.parse(process.env)

console.log(`\n🗄️  Drizzle running against: ${env.toUpperCase()}\n`)

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/infrastructure/db/schema',
  out: './src/server/infrastructure/db/migrations',
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
