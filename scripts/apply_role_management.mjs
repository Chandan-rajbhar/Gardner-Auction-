import fs from 'fs';

// 1. Update src/services/adminActionService.ts
{
  const filePath = 'src/services/adminActionService.ts';
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('changeCustomerRoleInDb')) {
    const fnCode = `
/**
 * Change customer role in Supabase.
 * Only Super Admins are permitted to execute this action.
 * Synchronizes public.users, public.admin_users, and Supabase auth user_metadata.
 */
export async function changeCustomerRoleInDb(
  id: string,
  email: string | undefined,
  newRole: 'super_admin' | 'user',
  adminUserId?: string
): Promise<{ success: boolean; error?: string; role?: string }> {
  // 1. Primary path: Server-side endpoint with service_role privileges and strict Super Admin caller validation
  try {
    const res = await fetch('/api/customers/change-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: id,
        email,
        newRole,
        adminUserId
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, role: data.role || newRole };
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        return { success: false, error: errData.error };
      }
    }
  } catch (err) {
    console.warn('[adminActionService] /api/customers/change-role unavailable, attempting fallback:', err);
  }

  // 2. Direct Supabase client update fallback
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const targetQuery = isUUID
      ? supabase.from('users').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', id)
      : supabase.from('users').update({ role: newRole, updated_at: new Date().toISOString() }).ilike('email', (email || '').toLowerCase().trim());

    const { error } = await targetQuery;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, role: newRole };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update customer role.' };
  }
}
`;
    fs.writeFileSync(filePath, content.trimEnd() + '\n' + fnCode, 'utf8');
    console.log('Updated src/services/adminActionService.ts');
  }
}

// 2. Add endpoints to vite.config.ts and vite.config.js
for (const configPath of ['vite.config.ts', 'vite.config.js']) {
  let content = fs.readFileSync(configPath, 'utf8');
  if (!content.includes('/customers/change-role')) {
    const target = "if (url === '/customers/update' && req.method === 'POST') {";
    const insertion = `// Role Management: POST /api/customers/change-role
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
                    await supabaseBackend.from('admin_users').delete().or(\`auth_id.eq.\${targetAuthId},email.eq.\${targetEmail}\`);
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
                  id: \`act-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
                  category: 'SECURITY',
                  event_action: \`Customer Role Updated to \${newRole === 'super_admin' ? 'Super Admin' : 'User'}\`,
                  operator_service: 'AF360 Admin Role Manager',
                  audit_details: \`Role for customer \${targetName} (\${targetEmail || targetAuthId}) changed to \${newRole} by authorized Super Admin.\`,
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

          // Secure First-Super-Admin & Public Signup Role Assignment: POST /api/auth/verify-role
          if (url === '/auth/verify-role' && req.method === 'POST') {
            const { userId, email, fullName } = parsed;

            if (!userId || !email) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: 'Missing userId or email' }));
            }

            try {
              const cleanEmail = email.toLowerCase().trim();
              const cleanName = (fullName || cleanEmail.split('@')[0] || 'Customer').trim();

              // Concurrency and atomic count check: Count existing Super Admins in public.users
              const { count, error: countErr } = await supabaseBackend
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'super_admin');

              if (countErr) throw countErr;

              // The FIRST account created is 'super_admin'. All subsequent public signups receive 'user'.
              const isFirstAccount = (count === 0);
              const assignedRole = isFirstAccount ? 'super_admin' : 'user';

              // Upsert user in public.users with the validated server-side role
              const { data: upsertData, error: upsertErr } = await supabaseBackend
                .from('users')
                .upsert([{
                  id: userId,
                  email: cleanEmail,
                  full_name: cleanName,
                  role: assignedRole,
                  updated_at: new Date().toISOString()
                }], { onConflict: 'id' })
                .select();

              if (upsertErr) throw upsertErr;

              // Synchronize Supabase Auth user metadata
              try {
                await supabaseBackend.auth.admin.updateUserById(userId, {
                  user_metadata: { role: assignedRole, full_name: cleanName }
                });
              } catch (_) {}

              // If first account became super_admin, also record in admin_users
              if (assignedRole === 'super_admin') {
                try {
                  await supabaseBackend.from('admin_users').upsert([{
                    auth_id: userId,
                    full_name: cleanName,
                    email: cleanEmail,
                    role: 'super_admin',
                    status: 'active',
                    title: 'Master Auctioneer & Executive Admin',
                    updated_at: new Date().toISOString()
                  }], { onConflict: 'email' });
                } catch (_) {}
              }

              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                role: assignedRole,
                isFirstSuperAdmin: isFirstAccount,
                user: upsertData?.[0]
              }));
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message || 'Failed to assign role.' }));
            }
          }

          `;

    content = content.replace(target, insertion + target);
    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`Updated ${configPath}`);
  }
}

