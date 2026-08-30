import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'import.meta.env.API_KEY': JSON.stringify(env.API_KEY ?? ''),
    },
    plugins: [react(), tailwindcss()],
  }
})
