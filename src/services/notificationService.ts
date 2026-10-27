import { supabase, supabaseAdmin } from '../lib/supabase';
import { NotificationRecord, NotificationType } from '../types';

export const NOTIFICATIONS_CHANGED_EVENT = 'gardner_notifications_changed';

class NotificationService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  constructor() {
    // Clean up any legacy localStorage fallback cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('gardner_notifications_state_v1');
      } catch (_) {}
    }
  }

  /**
   * Broadcast change event across window components
   */
  public notifyChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    }
  }

  /**
   * Helper to format relative time (e.g. "Just now", "4m ago", "2h ago", "Yesterday", "Oct 27")
   */
  public formatRelativeTime(dateInput?: string | Date): string {
    if (!dateInput) return 'Just now';
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 30) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;

      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateInput);
    }
  }

  /**
   * Helper to format full readable timestamp
   */
  public formatFullDate(dateInput?: string | Date): string {
    if (!dateInput) return new Date().toLocaleString();
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return String(dateInput);
    }
  }

  /**
   * Fetch all notifications directly from Supabase (strictly dynamic Supabase database records).
   */
  public async getNotifications(): Promise<NotificationRecord[]> {
    try {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[NotificationService] Supabase query error:', error);
        throw new Error(error.message);
      }

      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || 'system',
        recipient_id: row.recipient_id || null,
        recipient_role: row.recipient_role || 'admin',
        related_module: row.related_module || null,
        related_record_id: row.related_record_id || null,
        action_url: row.action_url || null,
        is_read: Boolean(row.is_read),
        metadata: row.metadata || {},
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || row.created_at || new Date().toISOString()
      }));
    } catch (err) {
      console.error('[NotificationService] Failed to load notifications from Supabase:', err);
      return [];
    }
  }

  /**
   * Mark a single notification as read in Supabase
   */
  public async markAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase markAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Mark a single notification as unread in Supabase
   */
  public async markAsUnread(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase markAsUnread failed:', err);
      throw err;
    }
  }

  /**
   * Mark all unread notifications as read in Supabase
   */
  public async markAllAsRead(currentRecords?: NotificationRecord[]): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('is_read', false);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase markAllAsRead failed:', err);
      throw err;
    }
  }

  /**
   * Bulk mark notifications as read or unread in Supabase
   */
  public async markBulkRead(ids: string[], isRead: boolean): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    try {
      const { error } = await this.client
        .from('notifications')
        .update({ is_read: isRead, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase markBulkRead failed:', err);
      throw err;
    }
  }

  /**
   * Delete a single notification from Supabase
   */
  public async deleteNotification(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase deleteNotification failed:', err);
      throw err;
    }
  }

  /**
   * Bulk delete notifications from Supabase
   */
  public async deleteBulkNotifications(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;
    try {
      const { error } = await this.client
        .from('notifications')
        .delete()
        .in('id', ids);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase deleteBulkNotifications failed:', err);
      throw err;
    }
  }

  /**
   * Update notification fields in Supabase
   */
  public async updateNotification(id: string, updates: Partial<NotificationRecord>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('notifications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      this.notifyChange();
      return true;
    } catch (err) {
      console.error('[NotificationService] Supabase updateNotification failed:', err);
      throw err;
    }
  }

  /**
   * Create a new notification directly in Supabase
   */
  public async createNotification(
    data: Omit<NotificationRecord, 'id' | 'created_at'>
  ): Promise<NotificationRecord> {
    const newRecord: NotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      recipient_id: data.recipient_id || 'all',
      recipient_role: data.recipient_role || 'admin',
      related_module: data.related_module || null,
      related_record_id: data.related_record_id || null,
      action_url: data.action_url || null,
      is_read: Boolean(data.is_read),
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await this.client.from('notifications').insert([
        {
          id: newRecord.id,
          title: newRecord.title,
          message: newRecord.message,
          type: newRecord.type,
          recipient_id: newRecord.recipient_id,
          recipient_role: newRecord.recipient_role,
          related_module: newRecord.related_module,
          related_record_id: newRecord.related_record_id,
          action_url: newRecord.action_url,
          is_read: newRecord.is_read,
          metadata: newRecord.metadata,
          created_at: newRecord.created_at,
          updated_at: newRecord.updated_at
        }
      ]);

      if (error) {
        console.error('[NotificationService] Insert error:', error);
        throw error;
      }

      this.notifyChange();
      return newRecord;
    } catch (err) {
      console.error('[NotificationService] Supabase insert notification failed:', err);
      throw err;
    }
  }

  /**
   * Realtime subscription on public.notifications
   */
  public subscribeToNotifications(callback: () => void): () => void {
    const channelName = `realtime_notifs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        callback();
      })
      .subscribe();

    const handleLocal = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocal);
    }

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocal);
      }
    };
  }
}

export const notificationService = new NotificationService();
