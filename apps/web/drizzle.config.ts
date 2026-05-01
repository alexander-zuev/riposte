import { defineConfig } from 'drizzle-kit'

const isProd = process.env.DRIZZLE_ENV === 'production'

export default defineConfig({
  schema: './src/server/db/schema',
  out: './src/server/db/migrations',
  dialect: 'sqlite',

  ...(isProd
    ? {
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }
    : {
        dbCredentials: {
          url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/placeholder.sqlite',
        },
      }),

  strict: true,
  verbose: true,
  tablesFilter: ['!_cf_KV'],
})
