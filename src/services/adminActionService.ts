import { supabase } from '../lib/supabase';

/**
 * Delete a customer record from Supabase.
 * First attempts server-side endpoint /api/customers/delete (which runs with administrative privileges
 * and bypasses RLS without triggering browser secret-key restrictions).
 * Falls back to direct supabase client if needed.
 */
export async function deleteCustomerFromDb(
  id: string, 
  email?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Attempt via server-side endpoint
  try {
    const res = await fetch('/api/customers/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    console.warn('[adminActionService] Server endpoint unavailable, falling back to direct client:', err);
  }

  // 2. Direct Supabase client fallback
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
    } else if (email) {
      const { error } = await supabase.from('users').delete().eq('email', email.toLowerCase());
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete customer' };
  }
}

/**
 * Update an existing customer record in Supabase.
 */
export async function updateCustomerInDb(
  id: string, 
  payload: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  // 1. Attempt via server-side endpoint
  try {
    const res = await fetch('/api/customers/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    console.warn('[adminActionService] Server endpoint unavailable, falling back to direct client:', err);
  }

  // 2. Direct Supabase client fallback
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('users').upsert([{ id, ...payload }]);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update customer' };
  }
}

/**
 * Deactivate a customer safely to preserve historical auction records.
 */
export async function deactivateCustomerInDb(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Attempt via server-side endpoint
  try {
    const res = await fetch('/api/customers/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
    }
  } catch (err) {
    console.warn('[adminActionService] Server endpoint unavailable, falling back to direct client:', err);
  }

  // 2. Direct Supabase client fallback
  try {
    const { error } = await supabase
      .from('users')
      .update({
        title: 'Deactivated Customer - Historical Bids Preserved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to deactivate customer' };
  }
}

/**
 * Delete an administrator record from Supabase.
 */
export async function deleteAdminFromDb(
  id: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Direct Supabase client (admin_users table allows direct delete)
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (!error) return { success: true };
    } else if (email) {
      const { error } = await supabase.from('admin_users').delete().eq('email', email.toLowerCase());
      if (!error) return { success: true };
    }
  } catch (err) {
    console.warn('[adminActionService] Direct client delete error, trying API endpoint:', err);
  }

  // 2. Server-side endpoint fallback
  try {
    const res = await fetch('/api/admins/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
      if (data.error) return { success: false, error: data.error };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete administrator' };
  }

  return { success: true };
}

/**
 * Update an administrator record in Supabase.
 */
export async function updateAdminInDb(
  id: string,
  payload: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  // 1. Direct Supabase client (admin_users table allows direct update)
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('admin_users').update(payload).eq('id', id);
      if (!error) return { success: true };
    } else {
      const { error } = await supabase.from('admin_users').upsert([{ id, ...payload }]);
      if (!error) return { success: true };
    }
  } catch (err) {
    console.warn('[adminActionService] Direct client update error, trying API endpoint:', err);
  }

  // 2. Server-side endpoint fallback
  try {
    const res = await fetch('/api/admins/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
      if (data.error) return { success: false, error: data.error };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update administrator' };
  }

  return { success: true };
}
