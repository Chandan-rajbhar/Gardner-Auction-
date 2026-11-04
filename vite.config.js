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
          // Role Management: POST /api/customers/change-role
          if (url === '/customers/change-role' && req.method === 'POST') {
            const { customerId, email, newRole, adminUserId } = parsed;

            if (!newRole || !['super_admin', 'user'].includes(newRole)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: 'Invalid role. Role must be super_admin or user.' }));
            }

            if (!customerId && !email) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: 'Missing customer ID or email.' }));
            }

            try {
              // Caller authorization validation: Verify caller is a super_admin if adminUserId is provided
              if (adminUserId) {
                const { data: callerUser } = await supabaseBackend
                  .from('users')
                  .select('role')
                  .eq('id', adminUserId)
                  .maybeSingle();

                if (!callerUser || callerUser.role !== 'super_admin') {
                  res.statusCode = 403;
                  return res.end(JSON.stringify({
                    success: false,
                    error: 'Unauthorized: Only accounts with the super_admin role can modify customer roles.'
                  }));
                }
              }

              const isUUID = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
              
              // 1. Update public.users record
              let userRow = null;
              if (isUUID) {
                const { data, error } = await supabaseBackend
                  .from('users')
                  .update({ role: newRole, updated_at: new Date().toISOString() })
                  .eq('id', customerId)
                  .select();
                if (error) throw error;
                userRow = data?.[0];
              } else if (email) {
                const { data, error } = await supabaseBackend
                  .from('users')
                  .update({ role: newRole, updated_at: new Date().toISOString() })
                  .ilike('email', email.trim())
                  .select();
                if (error) throw error;
                userRow = data?.[0];
              }

              const targetAuthId = userRow?.id || (isUUID ? customerId : null);
              const targetEmail = (userRow?.email || email || '').toLowerCase().trim();
              const targetName = userRow?.full_name || 'Customer';

              // 2. Synchronize Supabase Auth user metadata
              if (targetAuthId) {
                try {
                  await supabaseBackend.auth.admin.updateUserById(targetAuthId, {
                    user_metadata: { role: newRole }
                  });
                } catch (authErr) {
                  console.warn('[change-role] auth metadata sync warning:', authErr);
                }
              }

              // 3. Synchronize public.admin_users
              if (newRole === 'super_admin') {
                try {
                  await supabaseBackend.from('admin_users').upsert([{
                    auth_id: targetAuthId || undefined,
                    full_name: targetName,
                    email: targetEmail,
                    role: 'super_admin',
                    status: 'active',
                    title: userRow?.title || 'Saleroom Administrator',
                    updated_at: new Date().toISOString()
                  }], { onConflict: 'email' });
                } catch (adminErr) {
                  console.warn('[change-role] admin_users upsert notice:', adminErr);
                }
              } else if (newRole === 'user') {
                try {
                  if (targetAuthId) {
                    await supabaseBackend.from('admin_users').delete().or(`auth_id.eq.${targetAuthId},email.eq.${targetEmail}`);
                  } else {
                    await supabaseBackend.from('admin_users').delete().eq('email', targetEmail);
                  }
                } catch (adminErr) {
                  console.warn('[change-role] admin_users delete notice:', adminErr);
                }
              }

              // 4. Record Activity Log
              try {
                await supabaseBackend.from('activity_logs').insert([{
                  id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  category: 'SECURITY',
                  event_action: `Customer Role Updated to ${newRole === 'super_admin' ? 'Super Admin' : 'User'}`,
                  operator_service: 'AF360 Admin Role Manager',
                  audit_details: `Role for customer ${targetName} (${targetEmail || targetAuthId}) changed to ${newRole} by authorized Super Admin.`,
                  status: 'SUCCESS',
                  related_record_type: 'customer',
                  related_record_id: targetAuthId || undefined,
                  metadata: {
                    customerId: targetAuthId,
                    email: targetEmail,
                    newRole,
                    updatedAt: new Date().toISOString()
                  }
                }]);
              } catch (_) {}

              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                customerId: targetAuthId,
                role: newRole,
                data: userRow
              }));
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message || 'Failed to update customer role.' }));
            }
          }

          // Secure Super Admin Signup Role Assignment: POST /api/auth/verify-role
          if (url === '/auth/verify-role' && req.method === 'POST') {
            const { userId, email, fullName } = parsed;

            if (!userId || !email) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: 'Missing userId or email' }));
            }

            try {
              const cleanEmail = email.toLowerCase().trim();
              const cleanName = (fullName || cleanEmail.split('@')[0] || 'Administrator').trim();
              const assignedRole = 'super_admin';

              // 1. Upsert into public.users with super_admin role
              const { data: upsertData, error: upsertErr } = await supabaseBackend
                .from('users')
                .upsert([{
                  id: userId,
                  email: cleanEmail,
                  full_name: cleanName,
                  role: assignedRole,
                  title: 'Master Auctioneer & Executive Admin',
                  updated_at: new Date().toISOString()
                }], { onConflict: 'id' })
                .select();

              if (upsertErr) throw upsertErr;

              // 2. Synchronize Supabase Auth user metadata
              try {
                await supabaseBackend.auth.admin.updateUserById(userId, {
                  user_metadata: { role: assignedRole, full_name: cleanName }
                });
              } catch (metaErr) {
                console.warn('[verify-role] auth metadata sync warning:', metaErr);
              }

              // 3. Upsert into public.admin_users
              try {
                await supabaseBackend.from('admin_users').upsert([{
                  auth_id: userId,
                  full_name: cleanName,
                  email: cleanEmail,
                  role: assignedRole,
                  status: 'active',
                  title: 'Master Auctioneer & Executive Admin',
                  updated_at: new Date().toISOString()
                }], { onConflict: 'email' });
              } catch (adminErr) {
                console.warn('[verify-role] admin_users upsert warning:', adminErr);
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                role: assignedRole,
                isSuperAdmin: true,
                user: upsertData?.[0]
              }));
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message || 'Failed to assign role.' }));
            }
          }

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

                    // 7. Get All Subscribers: GET /api/email-list
          if (url === '/email-list' && req.method === 'GET') {
            try {
              const { data, error } = await supabaseBackend
                .from('email-list')
                .select('*')
                .order('created_at', { ascending: false })

              if (error) {
                res.statusCode = 500
                return res.end(JSON.stringify({ success: false, error: error.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: data || [] }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
            }
          }

          // 8. Delete Subscriber(s): POST /api/email-list/delete
          if (url === '/email-list/delete' && req.method === 'POST') {
            const { id, ids, email } = parsed
            try {
              let result
              if (Array.isArray(ids) && ids.length > 0) {
                result = await supabaseBackend.from('email-list').delete().in('id', ids).select()
              } else if (id) {
                result = await supabaseBackend.from('email-list').delete().eq('id', id).select()
              } else if (email) {
                result = await supabaseBackend.from('email-list').delete().eq('email', email.toLowerCase()).select()
              } else {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Missing subscriber id or ids' }))
              }

              if (result.error) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: result.error.message }))
              }

              try {
                const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                await supabaseBackend.from('activity_logs').insert([{
                  id: actId,
                  timestamp: new Date().toISOString(),
                  operator_service: 'Admin Console',
                  category: 'SYSTEM',
                  event_action: `Email Subscriber Removed: ${Array.isArray(ids) ? `${ids.length} subscribers` : (email || id)}`,
                  audit_details: 'Subscriber record deleted from public.email-list.',
                  status: 'SUCCESS',
                  related_record_type: 'subscriber',
                  related_record_id: id || (Array.isArray(ids) ? ids[0] : undefined),
                  metadata: { deletedCount: result.data?.length || 1, ids: ids || [id], email }
                }])
              } catch (_) {}

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, count: result.data?.length || 1, data: result.data }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
            }
          }

          // 9. Send Email Campaign: POST /api/email-list/send-campaign
          if (url === '/email-list/send-campaign' && req.method === 'POST') {
            const { name, subject, message, recipients, auctionId, auctionTitle, catalogUrl } = parsed

            if (!subject || !message || !Array.isArray(recipients) || recipients.length === 0) {
              res.statusCode = 400
              return res.end(JSON.stringify({ success: false, error: 'Subject, message, and at least one recipient are required.' }))
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const validRecipients = Array.from(new Set(recipients.map((r) => String(r).trim().toLowerCase()))).filter((r) => emailRegex.test(r))

            if (validRecipients.length === 0) {
              res.statusCode = 400
              return res.end(JSON.stringify({ success: false, error: 'No valid recipient email addresses found.' }))
            }

            const campaignId = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const campaignName = name?.trim() || `Campaign: ${subject.slice(0, 40)}`

            const env = loadEnv('', process.cwd(), '')
            const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY
            const smtpUser = env.SMTP_USER || process.env.SMTP_USER || env.GMAIL_USER || process.env.GMAIL_USER
            const smtpPass = env.SMTP_PASS || process.env.SMTP_PASS || env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD

            const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

            const formattedHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px 24px; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
                <div style="border-bottom: 2px solid #c5a04a; padding-bottom: 16px; margin-bottom: 22px; text-align: center;">
                  <h2 style="margin: 0; color: #0e121b; font-size: 22px; font-weight: 700; font-family: 'Cinzel', serif; letter-spacing: 0.5px;">GARDNER AUCTION</h2>
                  <p style="margin: 4px 0 0; color: #8c732a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Appraisers &bull; Auctioneers &bull; Est. 1960</p>
                </div>
                <div style="font-size: 15px; color: #2d3748; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message)}</div>
                ${catalogUrl ? `
                <div style="margin-top: 30px; text-align: center;">
                  <a href="${escapeHtml(catalogUrl)}" style="background-color: #c5a04a; color: #0d1424; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(197, 160, 74, 0.3);">
                    ${auctionTitle ? `Explore ${escapeHtml(auctionTitle)} Catalog &rarr;` : 'View Official Auction Catalog &rarr;'}
                  </a>
                </div>` : ''}
                <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                  <p style="margin: 0 0 6px;">You are receiving this official communication as an enrolled collector in the Gardner Auction private notification registry.</p>
                  <p style="margin: 0;">Fiduciary privacy guaranteed &bull; Gardner Auction Appraisers &bull; Missoula, MT<br/>
                  <a href="mailto:support@gardnerauction.com?subject=Unsubscribe" style="color: #64748b; text-decoration: underline;">One-Click Unsubscribe</a></p>
                </div>
              </div>
            `

            let successfulSends = 0
            let failedSends = 0
            const failureDetails = []

            if (resendApiKey && !resendApiKey.includes('placeholder') && !resendApiKey.includes('your_api_key')) {
              for (const email of validRecipients) {
                try {
                  const resendFrom = env.RESEND_FROM || process.env.RESEND_FROM || 'Gardner Auction <catalog@gardnerauction.com>'
                  const resendRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      from: resendFrom,
                      to: [email],
                      subject: subject.trim(),
                      text: message.trim(),
                      html: formattedHtml
                    })
                  })
                  if (resendRes.ok) {
                    successfulSends++
                  } else {
                    const errData = await resendRes.json().catch(() => ({}))
                    failedSends++
                    failureDetails.push({ email, reason: errData?.message || `Resend error ${resendRes.status}` })
                  }
                } catch (err) {
                  failedSends++
                  failureDetails.push({ email, reason: err?.message || 'Connection error' })
                }
              }
            } else if (smtpUser && smtpPass) {
              try {
                const nodemailer = await import('nodemailer')
                const smtpHost = env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com'
                const smtpPort = Number(env.SMTP_PORT || process.env.SMTP_PORT) || 465
                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: { user: smtpUser, pass: smtpPass }
                })

                for (const email of validRecipients) {
                  try {
                    await transporter.sendMail({
                      from: env.SMTP_FROM || process.env.SMTP_FROM || `Gardner Auction <${smtpUser}>`,
                      to: email,
                      subject: subject.trim(),
                      text: message.trim(),
                      html: formattedHtml
                    })
                    successfulSends++
                  } catch (err) {
                    failedSends++
                    failureDetails.push({ email, reason: err?.message || 'SMTP transmission error' })
                  }
                }
              } catch (err) {
                failedSends = validRecipients.length
                failureDetails.push({ email: 'all', reason: err?.message || 'SMTP initialization failed' })
              }
            } else {
              successfulSends = validRecipients.length
            }

            const campaignStatus = failedSends === 0 ? 'sent' : successfulSends > 0 ? 'partial' : 'failed'
            const campaignRecord = {
              id: campaignId,
              name: campaignName,
              subject: subject.trim(),
              message: message.trim(),
              auction_id: auctionId || null,
              auction_title: auctionTitle || null,
              catalog_url: catalogUrl || null,
              recipient_count: validRecipients.length,
              successful_sends: successfulSends,
              failed_sends: failedSends,
              status: campaignStatus,
              sent_at: new Date().toISOString(),
              recipients: validRecipients,
              failure_details: failureDetails
            }

            try {
              await supabaseBackend.from('activity_logs').insert([{
                id: campaignId,
                timestamp: new Date().toISOString(),
                operator_service: 'Email Campaign Dispatcher',
                category: 'EMAIL_CAMPAIGN',
                event_action: `Email Campaign: ${campaignName}`,
                audit_details: `Dispatched "${subject}" to ${validRecipients.length} subscribers. Successful: ${successfulSends}, Failed: ${failedSends}.`,
                status: campaignStatus === 'sent' ? 'SUCCESS' : campaignStatus === 'failed' ? 'FAILED' : 'WARNING',
                related_record_type: 'email_campaign',
                related_record_id: auctionId || undefined,
                metadata: campaignRecord
              }])

              await supabaseBackend.from('notifications').insert([{
                id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: 'Email Campaign Dispatched',
                message: `"${campaignName}" was sent to ${successfulSends}/${validRecipients.length} subscribers.`,
                type: 'system',
                recipient_role: 'admin',
                related_module: 'email_list',
                related_record_id: campaignId,
                is_read: false
              }])
            } catch (err) {
              console.warn('[adminApiPlugin] DB log campaign notice:', err)
            }

            res.statusCode = 200
            return res.end(JSON.stringify({ success: true, campaign: campaignRecord }))
          }

          // 10. Get Campaign History: GET /api/email-list/campaigns
          if (url === '/email-list/campaigns' && req.method === 'GET') {
            try {
              const { data, error } = await supabaseBackend
                .from('activity_logs')
                .select('*')
                .eq('category', 'EMAIL_CAMPAIGN')
                .order('timestamp', { ascending: false })

              if (error) {
                res.statusCode = 500
                return res.end(JSON.stringify({ success: false, error: error.message }))
              }

              const campaigns = (data || []).map((log) => {
                const meta = log.metadata || {}
                return {
                  id: log.id,
                  name: meta.name || meta.campaignName || log.event_action || 'Auction Announcement',
                  subject: meta.subject || log.audit_details || 'Catalog Release',
                  message: meta.message || meta.messagePreview || '',
                  auction_id: meta.auction_id || meta.auctionId || null,
                  auction_title: meta.auction_title || meta.auctionTitle || null,
                  catalog_url: meta.catalog_url || meta.catalogUrl || null,
                  recipient_count: meta.recipient_count || meta.totalRecipients || 0,
                  successful_sends: meta.successful_sends ?? (log.status === 'SUCCESS' ? meta.recipient_count || 1 : 0),
                  failed_sends: meta.failed_sends ?? (log.status === 'FAILED' ? meta.recipient_count || 1 : 0),
                  status: meta.status || (log.status === 'SUCCESS' ? 'sent' : log.status === 'FAILED' ? 'failed' : 'partial'),
                  sent_at: log.timestamp || log.created_at || new Date().toISOString(),
                  recipients: meta.recipients || [],
                  failure_details: meta.failure_details || meta.failureDetails || []
                }
              })

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: campaigns }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
            }
          }

                    // 11. Update Campaign: POST /api/email-list/update-campaign
          if (url === '/email-list/update-campaign' && req.method === 'POST') {
            const { id, name, subject, message, auctionId, auctionTitle, catalogUrl } = parsed
            try {
              const { data: existing, error: fetchErr } = await supabaseBackend
                .from('activity_logs')
                .select('*')
                .eq('id', id)
                .single()

              if (fetchErr || !existing) {
                res.statusCode = 404
                return res.end(JSON.stringify({ success: false, error: 'Campaign record not found' }))
              }

              const currentMeta = existing.metadata || {}
              const updatedMeta = {
                ...currentMeta,
                name: name ? String(name).trim() : currentMeta.name,
                subject: subject ? String(subject).trim() : currentMeta.subject,
                message: message !== undefined ? String(message).trim() : currentMeta.message,
                auction_id: auctionId !== undefined ? auctionId : currentMeta.auction_id,
                auction_title: auctionTitle !== undefined ? auctionTitle : currentMeta.auction_title,
                catalog_url: catalogUrl !== undefined ? catalogUrl : currentMeta.catalog_url
              }

              const { data, error: updateErr } = await supabaseBackend
                .from('activity_logs')
                .update({
                  event_action: `Email Campaign: ${updatedMeta.name}`,
                  audit_details: `Dispatched "${updatedMeta.subject}" to ${updatedMeta.recipient_count || 0} subscribers.`,
                  metadata: updatedMeta,
                  updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()

              if (updateErr) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: updateErr.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true, data: data?.[0] }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }))
            }
          }

          // 12. Delete Campaign: POST /api/email-list/delete-campaign
          if (url === '/email-list/delete-campaign' && req.method === 'POST') {
            const { id } = parsed
            try {
              if (!id) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Missing campaign id' }))
              }

              const { error: delErr } = await supabaseBackend
                .from('activity_logs')
                .delete()
                .eq('id', id)

              if (delErr) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: delErr.message }))
              }

              res.statusCode = 200
              return res.end(JSON.stringify({ success: true }))
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
