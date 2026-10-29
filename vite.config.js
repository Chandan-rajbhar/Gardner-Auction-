import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createClient } from '@supabase/supabase-js'

import { Buffer } from 'node:buffer'

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co'
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8')

const supabaseBackend = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

function adminApiPlugin() {
  return {
    name: 'admin-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const url = req.url?.split('?')[0] // stripped of '/api', e.g. '/customers/delete'

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          let parsed
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
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
            }
          }

          // 6. Send Settlement Email: POST /api/settlements/send-email
          if (url === '/settlements/send-email' && req.method === 'POST') {
            const { to, replyTo, bcc, subject, body, customerName, paddleNumber, invoiceNumber, auctionTitle, settlementLink } = parsed

            if (!to || !subject || !body) {
              res.statusCode = 400
              return res.end(JSON.stringify({ success: false, error: 'Recipient email, subject, and message body are required.' }))
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(String(to).trim())) {
              res.statusCode = 400
              return res.end(JSON.stringify({ success: false, error: `Invalid recipient email address: "${to}".` }))
            }

            // Check for configured providers in environment (.env or process.env)
            const env = loadEnv('', process.cwd(), '')
            const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY
            const smtpUser = env.SMTP_USER || process.env.SMTP_USER || env.GMAIL_USER || process.env.GMAIL_USER
            const smtpPass = env.SMTP_PASS || process.env.SMTP_PASS || env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD

            let sent = false
            let messageId = ''
            let providerUsed = ''
            let lastError = ''

            const escapeHtml = (str) => {
              return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
            }

            const formattedHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                <div style="border-bottom: 2px solid #a37a3b; padding-bottom: 14px; margin-bottom: 20px;">
                  <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Gardner Auction &amp; Appraisal</h2>
                  <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Official Settlement Statement &bull; Clerking &amp; Consignor Services</p>
                </div>
                <div style="white-space: pre-wrap; font-size: 14px; color: #334155; line-height: 1.7;">${escapeHtml(body)}</div>
                ${settlementLink ? `
                <div style="margin-top: 28px; text-align: center;">
                  <a href="${escapeHtml(settlementLink)}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                    View Official Settlement Statement
                  </a>
                </div>` : ''}
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                  Gardner Auction Service &bull; 200 Post Falls Way, Missoula, MT 59808<br/>
                  Telephone: +1 (406) 541-4400 &bull; Web: www.gardnerauction.com
                </div>
              </div>
            `

            // --- 1. Resend API ---
            if (resendApiKey && !resendApiKey.includes('placeholder') && !resendApiKey.includes('your_api_key')) {
              try {
                const resendFrom = env.RESEND_FROM || process.env.RESEND_FROM || 'Gardner Auction <settlements@gardnerauction.com>' || 'onboarding@resend.dev'
                const resendRes = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from: resendFrom,
                    to: [String(to).trim()],
                    reply_to: replyTo ? String(replyTo).trim() : undefined,
                    bcc: bcc ? [String(bcc).trim()] : undefined,
                    subject: String(subject).trim(),
                    text: String(body).trim(),
                    html: formattedHtml
                  })
                })

                const resendData = await resendRes.json().catch(() => ({}))
                if (resendRes.ok && resendData?.id) {
                  sent = true
                  messageId = resendData.id
                  providerUsed = 'Resend'
                } else {
                  lastError = resendData?.message || `Resend error (${resendRes.status})`
                }
              } catch (err) {
                lastError = err?.message || 'Failed connecting to Resend API'
              }
            }

            // --- 2. SMTP (Nodemailer / Gmail) ---
            if (!sent && smtpUser && smtpPass) {
              try {
                const nodemailer = await import('nodemailer')
                const smtpHost = env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com'
                const smtpPort = Number(env.SMTP_PORT || process.env.SMTP_PORT) || 465
                const smtpSecure = smtpPort === 465

                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpSecure,
                  auth: {
                    user: smtpUser,
                    pass: smtpPass
                  }
                })

                const info = await transporter.sendMail({
                  from: env.SMTP_FROM || process.env.SMTP_FROM || `Gardner Auction Settlements <${smtpUser}>`,
                  to: String(to).trim(),
                  replyTo: replyTo ? String(replyTo).trim() : undefined,
                  bcc: bcc ? String(bcc).trim() : undefined,
                  subject: String(subject).trim(),
                  text: String(body).trim(),
                  html: formattedHtml
                })

                if (info?.messageId) {
                  sent = true
                  messageId = info.messageId
                  providerUsed = `SMTP (${smtpHost})`
                }
              } catch (err) {
                lastError = err?.message || 'Failed to send email via SMTP'
              }
            }

            // --- 3. If no provider configured or transmission failed ---
            if (!sent) {
              res.statusCode = 503
              const msg = lastError 
                ? `Email provider transmission failed: ${lastError}`
                : 'No active email provider is configured. Please configure RESEND_API_KEY or SMTP credentials (SMTP_USER & SMTP_PASS) in your .env file to enable actual delivery to Gmail.'

              // Log failed attempt to Supabase activity_logs
              try {
                const failId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                await supabaseBackend.from('activity_logs').insert([{
                  id: failId,
                  timestamp: new Date().toISOString(),
                  operator_service: 'AF360 Email Engine',
                  category: 'SETTLEMENT',
                  event_action: `Settlement Email Failed: ${to}`,
                  audit_details: `Failed to dispatch statement for Invoice #${invoiceNumber || 'N/A'}: ${msg}`,
                  status: 'FAILED',
                  related_record_type: 'invoice',
                  related_record_id: invoiceNumber || undefined,
                  metadata: { recipient: to, error: msg, sentAt: new Date().toISOString() }
                }])
              } catch (_) {}

              return res.end(JSON.stringify({
                success: false,
                error: msg,
                missingCredentials: !resendApiKey && (!smtpUser || !smtpPass)
              }))
            }

            // --- 4. Success: Record Audit Log & Notification in Supabase ---
            try {
              const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
              await supabaseBackend.from('activity_logs').insert([{
                id: actId,
                timestamp: new Date().toISOString(),
                operator_service: `AF360 Email (${providerUsed})`,
                category: 'SETTLEMENT',
                event_action: `Settlement Email Delivered to ${to}`,
                audit_details: `Actual statement dispatched via ${providerUsed} for Invoice #${invoiceNumber || 'N/A'} (${customerName || 'Customer'}, Paddle #${paddleNumber || 'N/A'}). Provider MessageId: ${messageId}.`,
                status: 'SUCCESS',
                related_record_type: 'invoice',
                related_record_id: invoiceNumber || undefined,
                metadata: {
                  recipient: to,
                  replyTo: replyTo || null,
                  bcc: bcc || null,
                  subject,
                  messageId,
                  provider: providerUsed,
                  settlementLink: settlementLink || null,
                  sentAt: new Date().toISOString()
                }
              }])

              await supabaseBackend.from('notifications').insert([{
                id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: 'Settlement Email Delivered',
                message: `Settlement statement sent to ${customerName || to} (${to}) via ${providerUsed}.`,
                type: 'settlement',
                recipient_role: 'admin',
                related_module: 'payments',
                related_record_id: invoiceNumber || undefined,
                is_read: false
              }])

              // Update buyer_email in invoices table
              if (invoiceNumber) {
                await supabaseBackend.from('invoices').update({
                  buyer_email: to,
                  updated_at: new Date().toISOString()
                }).eq('invoice_number', invoiceNumber)
              }
            } catch (dbErr) {
              console.warn('[adminApiPlugin] DB log notice:', dbErr)
            }

            res.statusCode = 200
            return res.end(JSON.stringify({
              success: true,
              messageId,
              provider: providerUsed,
              recipient: to
            }))
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
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
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
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
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
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
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
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
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
  plugins: [
    react(),
    tailwindcss(),
    adminApiPlugin(),
  ],
})
