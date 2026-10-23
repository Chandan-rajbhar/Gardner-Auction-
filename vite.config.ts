import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co'
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8')

const supabaseBackend = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const url = req.url?.split('?')[0] // stripped of '/api', so e.g. '/customers/delete'

        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          let parsed: any = {}
          try {
            parsed = JSON.parse(body || '{}')
          } catch {
            parsed = {}
          }

          // 1. Delete Customer: POST /api/customers/delete
          if (url === '/customers/delete' && req.method === 'POST') {
            const { id, email } = parsed
            try {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              let result
              if (isUUID) {
                result = await supabaseBackend.from('users').delete().eq('id', id).select()
              } else if (email) {
                result = await supabaseBackend.from('users').delete().eq('email', email.toLowerCase()).select()
              } else {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Missing customer id or email' }))
              }

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: result.data }))
            } catch (err: any) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          }

          // 2. Update Customer: POST /api/customers/update
          if (url === '/customers/update' && req.method === 'POST') {
            const { id, ...updateFields } = parsed
            try {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              let result
              if (isUUID) {
                result = await supabaseBackend.from('users').update(updateFields).eq('id', id).select()
              } else {
                result = await supabaseBackend.from('users').upsert([{ id, ...updateFields }]).select()
              }

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: result.data }))
            } catch (err: any) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          }

          // 3. Deactivate Customer: POST /api/customers/deactivate
          if (url === '/customers/deactivate' && req.method === 'POST') {
            const { id } = parsed
            try {
              const result = await supabaseBackend
                .from('users')
                .update({
                  title: 'Deactivated Customer - Historical Bids Preserved',
                  updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: result.data }))
            } catch (err: any) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          }

          // 4. Delete Admin: POST /api/admins/delete
          if (url === '/admins/delete' && req.method === 'POST') {
            const { id, email } = parsed
            try {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              let result
              if (isUUID) {
                result = await supabaseBackend.from('admin_users').delete().eq('id', id).select()
              } else if (email) {
                result = await supabaseBackend.from('admin_users').delete().eq('email', email.toLowerCase()).select()
              } else {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Missing admin id' }))
              }

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: result.data }))
            } catch (err: any) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          }

          // 5. Update Admin: POST /api/admins/update
          if (url === '/admins/update' && req.method === 'POST') {
            const { id, ...updateFields } = parsed
            try {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
              let result
              if (isUUID) {
                result = await supabaseBackend.from('admin_users').update(updateFields).eq('id', id).select()
              } else {
                result = await supabaseBackend.from('admin_users').upsert([{ id, ...updateFields }]).select()
              }

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: result.data }))
            } catch (err: any) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          }

          res.statusCode = 404
          res.end(JSON.stringify({ error: `API route not found: ${url}` }))
        })
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), adminApiPlugin()],
  build: {
    chunkSizeWarningLimit: 1500,
  }
})
