import { defineConfig } from 'vite'
import { readdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const input = {}

const root = './src'
let folders = [`${root}`, `${root}/app/pages`]
for (const folder of folders) {
  if(existsSync(folder))
  for (const file of readdirSync(folder)) {
    if (file.endsWith('.html') || file.endsWith('.js')) {
      if (!(file in input)) {
        input[file] = `${folder}/${file}`
      }
    }
  }
}

export default defineConfig({
  root,
  build: {
    outDir: resolve('./bundle'),
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input
    },
  },
})