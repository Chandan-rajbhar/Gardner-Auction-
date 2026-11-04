import { jsonResponse, handleOptions, getSupabaseCredentials } from '../../_utils.js';

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

    const { customerId, email, newRole, adminUserId } = body;

    if (!newRole || !['super_admin', 'user'].includes(newRole)) {
      return jsonResponse({ success: false, error: 'Invalid role. Role must be super_admin or user.' }, 400, req);
    }

    if (!customerId && !email) {
      return jsonResponse({ success: false, error: 'Missing customer ID or email.' }, 400, req);
    }

    // Caller authorization validation: Verify caller is a super_admin if adminUserId is provided
    if (adminUserId) {
      const callerCheckUrl = `${url}/rest/v1/users?id=eq.${encodeURIComponent(adminUserId)}&select=role`;
      const callerRes = await fetch(callerCheckUrl, {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        }
      });
      const callerData = await callerRes.json().catch(() => []);
      if (!callerData?.[0] || callerData[0].role !== 'super_admin') {
        return jsonResponse({
          success: false,
          error: 'Unauthorized: Only accounts with the super_admin role can modify customer roles.'
        }, 403, req);
      }
    }

    const isUUID = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
    const updateUrl = isUUID 
      ? `${url}/rest/v1/users?id=eq.${encodeURIComponent(customerId)}`
      : `${url}/rest/v1/users?email=ilike.${encodeURIComponent(email.trim())}`;

    // 1. Update public.users record
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ role: newRole, updated_at: new Date().toISOString() })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return jsonResponse({ success: false, error: errText }, updateRes.status, req);
    }

    const updatedRows = await updateRes.json().catch(() => []);
    const userRow = updatedRows?.[0];
    const targetAuthId = userRow?.id || (isUUID ? customerId : null);
    const targetEmail = (userRow?.email || email || '').toLowerCase().trim();
    const targetName = userRow?.full_name || 'Customer';

    // 2. Synchronize Supabase Auth user metadata
    if (targetAuthId) {
      try {
        await fetch(`${url}/auth/v1/admin/users/${targetAuthId}`, {
          method: 'PUT',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_metadata: { role: newRole }
          })
        });
      } catch (authErr) {
        console.warn('[change-role] Auth metadata update warning:', authErr);
      }
    }

    // 3. Synchronize public.admin_users
    if (newRole === 'super_admin') {
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
            auth_id: targetAuthId || undefined,
            full_name: targetName,
            email: targetEmail,
            role: 'super_admin',
            status: 'active',
            title: userRow?.title || 'Saleroom Administrator',
            updated_at: new Date().toISOString()
          })
        });
      } catch (_) {}
    } else if (newRole === 'user') {
      try {
        const deleteAdminUrl = targetAuthId 
          ? `${url}/rest/v1/admin_users?or=(auth_id.eq.${encodeURIComponent(targetAuthId)},email.eq.${encodeURIComponent(targetEmail)})`
          : `${url}/rest/v1/admin_users?email=eq.${encodeURIComponent(targetEmail)}`;
        await fetch(deleteAdminUrl, {
          method: 'DELETE',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
          }
        });
      } catch (_) {}
    }

    // 4. Record Audit Log
    try {
      await fetch(`${url}/rest/v1/activity_logs`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });
    } catch (_) {}

    return jsonResponse({
      success: true,
      customerId: targetAuthId,
      role: newRole,
      data: userRow
    }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}

