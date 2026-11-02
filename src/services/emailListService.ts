import { supabase, supabaseAdmin } from '../lib/supabase';
import { EmailSubscriber, EmailCampaign, EmailListKPIs } from '../types/emailList';

export const EMAIL_LIST_CHANGED_EVENT = 'gardner_email_list_changed';

class EmailListService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Broadcast change event across window components
   */
  public notifyChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EMAIL_LIST_CHANGED_EVENT));
    }
  }

  /**
   * Fetch all subscribers dynamically from Supabase
   * Prefers administrative backend endpoint /api/email-list to bypass RLS,
   * with automatic fallback to direct Supabase client.
   */
  public async fetchSubscribers(): Promise<EmailSubscriber[]> {
    // 1. Try server-side endpoint (runs with service key to bypass user RLS)
    try {
      const res = await fetch('/api/email-list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map(this.normalizeSubscriber);
        }
      }
    } catch (err) {
      console.warn('[EmailListService] Server endpoint unavailable, falling back to direct Supabase client:', err);
    }

    // 2. Direct Supabase Client fallback
    try {
      const { data, error } = await this.client
        .from('email-list')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[EmailListService] Supabase select error:', error);
        throw error;
      }

      return (data || []).map(this.normalizeSubscriber);
    } catch (err) {
      console.error('[EmailListService] Failed to fetch subscribers:', err);
      return [];
    }
  }

  /**
   * Calculate live KPI statistics from subscriber records
   */
  public calculateKPIs(subscribers: EmailSubscriber[]): EmailListKPIs {
    const total = subscribers.length;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let active = 0;
    let newIn30d = 0;
    let unsubscribed = 0;

    subscribers.forEach((sub) => {
      const status = sub.status || 'active';
      if (status === 'active') {
        active++;
      } else if (status === 'unsubscribed') {
        unsubscribed++;
      }

      if (sub.created_at) {
        const createdMs = new Date(sub.created_at).getTime();
        if (!isNaN(createdMs) && createdMs >= thirtyDaysAgo) {
          newIn30d++;
        }
      }
    });

    return {
      totalSubscribers: total,
      activeSubscribers: active,
      newSubscribers30d: newIn30d,
      unsubscribedCount: unsubscribed
    };
  }

  /**
   * Delete a single subscriber record from Supabase
   */
  public async deleteSubscriber(id: string, email?: string): Promise<{ success: boolean; error?: string }> {
    // 1. Try server-side endpoint
    try {
      const res = await fetch('/api/email-list/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.notifyChange();
          return { success: true };
        }
        if (json.error) {
          return { success: false, error: json.error };
        }
      }
    } catch (err) {
      console.warn('[EmailListService] Server delete unavailable, falling back to direct client:', err);
    }

    // 2. Direct Supabase fallback
    try {
      const { error } = await this.client
        .from('email-list')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      this.notifyChange();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete subscriber' };
    }
  }

  /**
   * Delete multiple subscribers in bulk
   */
  public async bulkDeleteSubscribers(ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
    }

    // 1. Try server-side endpoint
    try {
      const res = await fetch('/api/email-list/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.notifyChange();
          return { success: true, count: json.count || ids.length };
        }
        if (json.error) {
          return { success: false, count: 0, error: json.error };
        }
      }
    } catch (err) {
      console.warn('[EmailListService] Server bulk delete unavailable, falling back to direct client:', err);
    }

    // 2. Direct Supabase fallback
    try {
      const { error } = await this.client
        .from('email-list')
        .delete()
        .in('id', ids);

      if (error) {
        return { success: false, count: 0, error: error.message };
      }

      this.notifyChange();
      return { success: true, count: ids.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Failed to delete selected subscribers' };
    }
  }

  /**
   * Dispatch an email campaign to selected subscribers
   */
  public async sendCampaign(payload: {
    name?: string;
    subject: string;
    message: string;
    recipients: string[];
    auctionId?: string;
    auctionTitle?: string;
    catalogUrl?: string;
  }): Promise<{ success: boolean; campaign?: EmailCampaign; error?: string }> {
    try {
      const res = await fetch('/api/email-list/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        this.notifyChange();
        return { success: true, campaign: json.campaign };
      }

      return {
        success: false,
        error: json.error || `Failed to dispatch campaign (${res.status})`
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to email dispatcher'
      };
    }
  }

  /**
   * Fetch campaign history records from Supabase activity_logs
   */
  public async fetchCampaignHistory(): Promise<EmailCampaign[]> {
    try {
      const res = await fetch('/api/email-list/campaigns', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[EmailListService] Server campaigns endpoint unavailable, falling back to direct logs:', err);
    }

    // Direct Supabase fallback from activity_logs
    try {
      const { data, error } = await this.client
        .from('activity_logs')
        .select('*')
        .eq('category', 'EMAIL_CAMPAIGN')
        .order('timestamp', { ascending: false });

      if (error || !data) return [];

      return data.map((log: any) => {
        const meta = log.metadata || {};
        return {
          id: log.id,
          name: meta.campaignName || log.event_action || 'Auction Announcement',
          subject: meta.subject || log.audit_details || 'Catalog Release',
          message: meta.messagePreview || '',
          auction_id: meta.auctionId || null,
          auction_title: meta.auctionTitle || null,
          catalog_url: meta.catalogUrl || null,
          recipient_count: meta.totalRecipients || 0,
          successful_sends: meta.successfulSends || (log.status === 'SUCCESS' ? meta.totalRecipients || 1 : 0),
          failed_sends: meta.failedSends || (log.status === 'FAILED' ? meta.totalRecipients || 1 : 0),
          status: log.status === 'SUCCESS' ? 'sent' : log.status === 'FAILED' ? 'failed' : 'partial',
          sent_at: log.timestamp || log.created_at || new Date().toISOString(),
          recipients: meta.recipients || [],
          failure_details: meta.failureDetails || []
        };
      });
    } catch (err) {
      console.error('[EmailListService] Error fetching direct campaign logs:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time changes on public.email-list
   */
  /**
   * Update an existing campaign's details in Supabase
   */
  public async updateCampaign(
    id: string,
    updates: {
      name?: string;
      subject?: string;
      message?: string;
      auctionId?: string | null;
      auctionTitle?: string | null;
      catalogUrl?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Try server-side endpoint
    try {
      const res = await fetch('/api/email-list/update-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        this.notifyChange();
        return { success: true };
      }
      if (json.error) return { success: false, error: json.error };
    } catch (err) {
      console.warn('[EmailListService] Server update campaign unavailable, trying direct:', err);
    }

    // 2. Direct Supabase fallback
    try {
      const { data: existing } = await this.client
        .from('activity_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (!existing) return { success: false, error: 'Campaign record not found' };

      const currentMeta = existing.metadata || {};
      const updatedMeta = {
        ...currentMeta,
        name: updates.name ? updates.name.trim() : currentMeta.name,
        subject: updates.subject ? updates.subject.trim() : currentMeta.subject,
        message: updates.message !== undefined ? updates.message.trim() : currentMeta.message,
        auction_id: updates.auctionId !== undefined ? updates.auctionId : currentMeta.auction_id,
        auction_title: updates.auctionTitle !== undefined ? updates.auctionTitle : currentMeta.auction_title,
        catalog_url: updates.catalogUrl !== undefined ? updates.catalogUrl : currentMeta.catalog_url
      };

      const { error } = await this.client
        .from('activity_logs')
        .update({
          event_action: `Email Campaign: ${updatedMeta.name}`,
          audit_details: `Dispatched "${updatedMeta.subject}" to ${updatedMeta.recipient_count || 0} subscribers.`,
          metadata: updatedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) return { success: false, error: error.message };

      this.notifyChange();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update campaign' };
    }
  }

  /**
   * Delete a campaign record from Supabase
   */
  public async deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
    // 1. Try server-side endpoint
    try {
      const res = await fetch('/api/email-list/delete-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        this.notifyChange();
        return { success: true };
      }
      if (json.error) return { success: false, error: json.error };
    } catch (err) {
      console.warn('[EmailListService] Server delete campaign unavailable, trying direct:', err);
    }

    // 2. Direct Supabase fallback
    try {
      const { error } = await this.client
        .from('activity_logs')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };

      this.notifyChange();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete campaign' };
    }
  }

  public subscribeToEmailList(callback: () => void): () => void {
    const channelName = `realtime_email_list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email-list' }, () => {
        callback();
      })
      .subscribe();

    const handleLocal = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener(EMAIL_LIST_CHANGED_EVENT, handleLocal);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener(EMAIL_LIST_CHANGED_EVENT, handleLocal);
      }
    };
  }

  private normalizeSubscriber(row: any): EmailSubscriber {
    return {
      id: row.id,
      user_id: row.user_id || null,
      email: row.email,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      status: row.status || 'active',
      source: row.source || 'Public Website'
    };
  }
}

export const emailListService = new EmailListService();

