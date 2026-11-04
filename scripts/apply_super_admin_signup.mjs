import fs from 'fs';

// 1. Update vite.config.ts and vite.config.js
for (const configPath of ['vite.config.ts', 'vite.config.js']) {
  let code = fs.readFileSync(configPath, 'utf8');

  // Replace /auth/verify-role logic so all account creations through signup receive super_admin
  const regexVerifyRole = /\/\/ Secure First-Super-Admin & Public Signup Role Assignment: POST \/api\/auth\/verify-role[\s\S]*?res\.statusCode = 200;\s*return res\.end\(JSON\.stringify\(\{[\s\S]*?\}\)\);/;

  const replacementVerifyRole = `// Secure Super Admin Signup Role Assignment: POST /api/auth/verify-role
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
              }));`;

  if (regexVerifyRole.test(code)) {
    code = code.replace(regexVerifyRole, replacementVerifyRole);
    fs.writeFileSync(configPath, code, 'utf8');
    console.log(`Updated ${configPath} with super_admin signup assignment`);
  } else {
    console.log(`Regex did not match in ${configPath}`);
  }
}

// 2. Update api/auth/verify-role.js
{
  const apiFile = 'api/auth/verify-role.js';
  const apiCode = `import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8');

const supabaseBackend = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { userId, email, fullName } = req.body || {};

  if (!userId || !email) {
    return res.status(400).json({ success: false, error: 'Missing userId or email' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0] || 'Administrator').trim();
    const assignedRole = 'super_admin';

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

    try {
      await supabaseBackend.auth.admin.updateUserById(userId, {
        user_metadata: { role: assignedRole, full_name: cleanName }
      });
    } catch (_) {}

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
    } catch (_) {}

    return res.status(200).json({
      success: true,
      role: assignedRole,
      isSuperAdmin: true,
      user: upsertData?.[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
`;
  fs.writeFileSync(apiFile, apiCode, 'utf8');
  console.log(`Updated ${apiFile}`);
}

// 3. Update functions/api/auth/verify-role.js
{
  const funcFile = 'functions/api/auth/verify-role.js';
  const funcCode = `import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400, req);
    }

    const { userId, email, fullName } = body;

    if (!userId || !email) {
      return jsonResponse({ success: false, error: 'Missing userId or email' }, 400, req);
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0] || 'Administrator').trim();
    const assignedRole = 'super_admin';

    // 1. Upsert record in public.users with super_admin role
    const upsertRes = await fetch(\`\${url}/rest/v1/users\`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: \`Bearer \${secretKey}\`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: assignedRole,
        title: 'Master Auctioneer & Executive Admin',
        updated_at: new Date().toISOString()
      })
    });

    const upsertData = await upsertRes.json().catch(() => []);

    // 2. Update auth user metadata
    try {
      await fetch(\`\${url}/auth/v1/admin/users/\${userId}\`, {
        method: 'PUT',
        headers: {
          apikey: secretKey,
          Authorization: \`Bearer \${secretKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: { role: assignedRole, full_name: cleanName }
        })
      });
    } catch (_) {}

    // 3. Upsert into admin_users
    try {
      await fetch(\`\${url}/rest/v1/admin_users\`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: \`Bearer \${secretKey}\`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          auth_id: userId,
          full_name: cleanName,
          email: cleanEmail,
          role: assignedRole,
          status: 'active',
          title: 'Master Auctioneer & Executive Admin',
          updated_at: new Date().toISOString()
        })
      });
    } catch (_) {}

    return jsonResponse({
      success: true,
      role: assignedRole,
      isSuperAdmin: true,
      user: upsertData?.[0]
    }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}
`;
  fs.writeFileSync(funcFile, funcCode, 'utf8');
  console.log(`Updated ${funcFile}`);
}

