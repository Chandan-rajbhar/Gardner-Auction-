import { supabase } from '../lib/supabase';

export const NOTIFICATIONS_CHANGED_EVENT = 'gardner_notifications_changed';
export const NOTIFICATIONS_REALTIME_CHANNEL = 'gardner_notifications_realtime';

export type NotificationType =
  | 'auction'
  | 'bidder'
  | 'clerking'
  | 'settlement'
  | 'system'
  | 'security';

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  recipient_id?: string | null;
  recipient_role?: string;
  related_module?: string | null;
  related_record_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

class NotificationService {
  /**
   * Broadcast change event locally across window components
   */
  public notifyChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    }
  }

  /**
   * Broadcast notification event across Supabase Realtime channel
   */
  private broadcastRealtimeNotification(record: NotificationRecord) {
    try {
      const channel = supabase.channel(NOTIFICATIONS_REALTIME_CHANNEL);
      channel.send({
        type: 'broadcast',
        event: 'notification_created',
        payload: record
      });
    } catch (err) {
      console.warn('[NotificationService] Broadcast notice:', err);
    }
  }

  /**
   * Create a notification in the existing Supabase notifications table
   */
  public async createNotification(
    data: Omit<NotificationRecord, 'id' | 'created_at'> & { id?: string }
  ): Promise<NotificationRecord | null> {
    const now = new Date().toISOString();
    const id = data.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newRecord: NotificationRecord = {
      id,
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      recipient_id: data.recipient_id || 'admin',
      recipient_role: data.recipient_role || 'admin',
      related_module: data.related_module || null,
      related_record_id: data.related_record_id || null,
      action_url: data.action_url || null,
      is_read: Boolean(data.is_read),
      metadata: data.metadata || {},
      created_at: now,
      updated_at: now
    };

    try {
      const { data: inserted, error } = await supabase
        .from('notifications')
        .insert([
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
        ])
        .select();

      if (error) {
        // If row violates unique constraint (e.g. concurrent retry), treat as duplicate prevention
        if (error.code === '23505') {
          console.log('[NotificationService] Duplicate notification suppressed by database key:', newRecord.id);
          return newRecord;
        }
        console.warn('[NotificationService] Insert notification notice:', error.message);
        return null;
      }

      this.notifyChange();
      this.broadcastRealtimeNotification(newRecord);
      return (inserted && inserted[0]) ? (inserted[0] as NotificationRecord) : newRecord;
    } catch (err) {
      console.warn('[NotificationService] Failed to insert notification into Supabase:', err);
      return null;
    }
  }

  /**
   * Automatically generate Email List Subscription Notification
   * Example:
   * Title: New Email List Subscriber
   * Message: john@example.com has subscribed to the Gardner Auction email list.
   * Type: system
   * Recipient: Admin
   * Status: unread
   */
  public async createEmailSubscriptionNotification(
    email: string,
    subscriptionId?: string
  ): Promise<NotificationRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;

    // Deterministic ID preventing duplicate notification if retried
    const notifId = `notif-email-${subscriptionId || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      // Check if notification already exists for this subscription / email
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .or(`id.eq.${notifId},related_record_id.eq.${subscriptionId || cleanEmail}`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('[NotificationService] Notification already exists for subscription:', cleanEmail);
        return null;
      }

      return await this.createNotification({
        id: notifId,
        title: 'New Email List Subscriber',
        message: `${cleanEmail} has subscribed to the Gardner Auction email list.`,
        type: 'system',
        recipient_id: 'admin',
        recipient_role: 'admin',
        related_module: 'email_list',
        related_record_id: subscriptionId || cleanEmail,
        action_url: '/email_list',
        is_read: false,
        metadata: {
          email: cleanEmail,
          subscriptionId,
          source: 'website_email_list'
        }
      });
    } catch (err) {
      console.warn('[NotificationService] createEmailSubscriptionNotification error:', err);
      return null;
    }
  }

  /**
   * Automatically generate New User Registration Notification
   * Example:
   * Title: New User Registration
   * Message: John Smith (john@example.com) has successfully created a new bidder account.
   * Type: system
   * Recipient: Admin
   * Status: unread
   */
  public async createNewUserRegistrationNotification(userData: {
    id: string;
    name: string;
    email: string;
  }): Promise<NotificationRecord | null> {
    const cleanId = userData.id;
    const cleanName = userData.name.trim() || 'New Bidder';
    const cleanEmail = userData.email.trim().toLowerCase();

    if (!cleanId || !cleanEmail) return null;

    // Deterministic ID preventing duplicate notification if retried
    const notifId = `notif-user-${cleanId}`;

    try {
      // Check if notification already exists for this user registration
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .or(`id.eq.${notifId},related_record_id.eq.${cleanId}`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('[NotificationService] Notification already exists for user registration:', cleanEmail);
        return null;
      }

      return await this.createNotification({
        id: notifId,
        title: 'New User Registration',
        message: `${cleanName} (${cleanEmail}) has successfully created a new bidder account.`,
        type: 'system',
        recipient_id: 'admin',
        recipient_role: 'admin',
        related_module: 'users',
        related_record_id: cleanId,
        action_url: '/users',
        is_read: false,
        metadata: {
          userId: cleanId,
          name: cleanName,
          email: cleanEmail,
          source: 'bidder_registration'
        }
      });
    } catch (err) {
      console.warn('[NotificationService] createNewUserRegistrationNotification error:', err);
      return null;
    }
  }

  /**
   * Fetch all notifications from Supabase
   */
  public async getNotifications(): Promise<NotificationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
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
      console.warn('[NotificationService] Failed to load notifications:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time notification changes (Postgres CDC + Realtime Broadcast + Polling Heartbeat)
   */
  public subscribeToNotifications(callback: () => void): () => void {
    const channelName = `realtime_notifs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // 1. Supabase Postgres CDC changes
    const cdcChannel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        callback();
      })
      .subscribe();

    // 2. Shared Broadcast channel for instant cross-tab updates
    const broadcastChannel = supabase
      .channel(NOTIFICATIONS_REALTIME_CHANNEL)
      .on('broadcast', { event: 'notification_created' }, () => {
        callback();
      })
      .subscribe();

    // 3. Local window event listener
    const handleLocal = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocal);
    }

    // 4. Fallback interval for background sync (every 6 seconds while tab is active)
    let pollInterval: any = null;
    if (typeof window !== 'undefined') {
      pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          callback();
        }
      }, 6000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          callback();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        supabase.removeChannel(cdcChannel);
        supabase.removeChannel(broadcastChannel);
        window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleLocal);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (pollInterval) clearInterval(pollInterval);
      };
    }

    return () => {
      supabase.removeChannel(cdcChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }
}

export const notificationService = new NotificationService();
