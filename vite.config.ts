import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lê .env / .env.local (inclusive variáveis sem o prefixo VITE_, que NÃO vão para o navegador)
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.API_KEY || env.VITE_API_KEY

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // A API exige X-API-Key. Aqui o proxy injeta a chave, então ela não vai no bundle.
          headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
        },
      },
    },
  }
})
