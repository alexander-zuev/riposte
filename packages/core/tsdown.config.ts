import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts'],
  clean: !process.argv.includes('--watch'),
  minify: false,
  deps: {
    neverBundle: ['zod'],
  },
})
