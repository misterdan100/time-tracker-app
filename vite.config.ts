import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only: serve the Vercel function in api/admin.ts from `npm run dev`, so the
 * admin panel works locally without `vercel dev`. Production uses Vercel's own runtime.
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/admin', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/admin.ts')
          const handler = mod[req.method ?? '']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed.' }))
            return
          }
          const chunks: Uint8Array[] = []
          for await (const chunk of req) chunks.push(chunk as Uint8Array)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }
          const response: Response = await handler(
            new Request(`http://localhost${req.originalUrl ?? '/api/admin'}`, {
              method: req.method,
              headers,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            })
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Server-side only: copy just the two variables the function needs. Never VITE_-prefix the key.
  // (Assigning undefined to process.env would store the string "undefined", hence the guards.)
  const env = loadEnv(mode, process.cwd(), '')
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  if (serviceKey && !process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey
  if (supabaseUrl && !process.env.SUPABASE_URL) process.env.SUPABASE_URL = supabaseUrl

  return {
    plugins: [react(), devApi()],
  }
})
