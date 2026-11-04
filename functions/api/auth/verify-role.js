import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

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
    const upsertRes = await fetch(`${url}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
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
      await fetch(`${url}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: { role: assignedRole, full_name: cleanName }
        })
      });
    } catch (_) {}

    // 3. Upsert into admin_users
    try {
      await fetch(`${url}/rest/v1/admin_users`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
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
