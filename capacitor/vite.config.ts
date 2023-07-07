import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

const  input = {}

const root = '..'
for (const file of readdirSync(root)) {
  if (file.endsWith('.html') || file.endsWith('.js')) {
    const name = file.replace('.html', '').replace('.js', '')
    if (!(name in input)) {
      input[name] = `${root}/${file}`
    }
  }
}
console.log('input', input)

export default defineConfig({
  root,
  build: {
    outDir: resolve('./pack'),
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input
    },
  },
})