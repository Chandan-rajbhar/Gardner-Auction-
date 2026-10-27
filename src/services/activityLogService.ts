import { supabase, supabaseAdmin } from '../lib/supabase';

export interface AuditLogRecord {
  id: string;
  timestamp: string; // Formatted time e.g., "12:44:10 PM"
  created_at: string; // Full ISO string
  operator_service: string;
  category: 'Clerking' | 'HiBid Sync' | 'Bidder' | 'Settlement' | 'Lot' | 'Auction' | 'System' | string;
  event_action: string;
  audit_details: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING' | 'ALERT' | string;
  related_record_type?: 'auction' | 'lot' | 'bidder' | 'invoice' | 'settlement' | null;
  related_record_id?: string | null;
  metadata?: Record<string, any>;
  is_annotated?: boolean;
  auditor_notes?: string;
}

class ActivityLogService {
  private get client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Helper to format UTC ISO date string into readable 12-hour timestamp (e.g., "12:44:10 PM")
   */
  public formatTimeOnly(dateInput?: string | Date): string {
    if (!dateInput) return new Date().toLocaleTimeString();
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(dateInput);
    }
  }

  /**
   * Helper to format full date-time (e.g., "Oct 27, 2026, 12:44:10 PM UTC")
   */
  public formatFullDateTime(dateInput?: string | Date): string {
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
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return String(dateInput);
    }
  }

  /**
   * Fetch all audit and activity logs directly and strictly from Supabase database.
   * No static or synthetic fallback data.
   */
  public async getAuditLogs(): Promise<AuditLogRecord[]> {
    try {
      const { data, error } = await this.client
        .from('activity_logs')
        .select('*');

      if (error) {
        console.error('[ActivityLogService] Supabase activity_logs query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const logs: AuditLogRecord[] = data.map((row: any) => {
        let timestampDisplay = '';
        if (row.timestamp) {
          timestampDisplay = typeof row.timestamp === 'string' && row.timestamp.includes('T') 
            ? this.formatTimeOnly(row.timestamp) 
            : String(row.timestamp);
        } else if (row.created_at) {
          timestampDisplay = this.formatTimeOnly(row.created_at);
        } else {
          timestampDisplay = new Date().toLocaleTimeString();
        }

        return {
          id: String(row.id),
          timestamp: timestampDisplay,
          created_at: row.created_at || row.timestamp || new Date().toISOString(),
          operator_service: row.operator_service || row.operator_name || row.operator || 'System',
          category: row.category || 'Clerking',
          event_action: row.event_action || row.action || '',
          audit_details: row.audit_details || row.details || '',
          status: (row.status || 'SUCCESS').toUpperCase(),
          related_record_type: row.related_record_type || null,
          related_record_id: row.related_record_id || null,
          metadata: row.metadata || {},
          is_annotated: Boolean(row.is_annotated),
          auditor_notes: row.auditor_notes || ''
        };
      });

      // Sort newest first
      logs.sort((a, b) => {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        if (isNaN(tA) || isNaN(tB)) {
          return String(b.id).localeCompare(String(a.id));
        }
        return tB - tA;
      });

      return logs;
    } catch (err) {
      console.error('[ActivityLogService] Failed to load activity logs from Supabase:', err);
      return [];
    }
  }

  /**
   * Record a new administrative event into Supabase
   */
  public async logEvent(entry: {
    operatorService?: string;
    category: string;
    eventAction: string;
    auditDetails: string;
    status?: 'SUCCESS' | 'INFO' | 'WARNING' | 'ALERT';
    relatedRecordType?: 'auction' | 'lot' | 'bidder' | 'invoice' | 'settlement' | null;
    relatedRecordId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      // First attempt insert with standard schema
      const { error: err1 } = await this.client.from('activity_logs').insert([
        {
          id,
          timestamp: now,
          created_at: now,
          operator_service: entry.operatorService || 'Super Admin',
          category: entry.category,
          event_action: entry.eventAction,
          audit_details: entry.auditDetails,
          status: entry.status || 'SUCCESS',
          related_record_type: entry.relatedRecordType || null,
          related_record_id: entry.relatedRecordId || null,
          metadata: entry.metadata || {}
        }
      ]);

      if (!err1) {
        return { success: true };
      }

      // Fallback attempt with alternative column names if schema differs
      const { error: err2 } = await this.client.from('activity_logs').insert([
        {
          id,
          timestamp: timeFormatted,
          operator_name: entry.operatorService || 'Super Admin',
          category: entry.category,
          action: entry.eventAction,
          details: entry.auditDetails,
          status: entry.status || 'SUCCESS'
        }
      ]);

      if (err2) {
        console.warn('[ActivityLogService] Could not persist to activity_logs table:', err2.message);
        return { success: false, error: err2.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Annotate an existing audit record with auditor notes
   */
  public async annotateLog(
    id: string, 
    auditorNotes: string,
    updatedCategory?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: any = {
        auditor_notes: auditorNotes,
        is_annotated: true,
        updated_at: new Date().toISOString()
      };
      if (updatedCategory) {
        updates.category = updatedCategory;
      }

      const { error } = await this.client
        .from('activity_logs')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.warn('[ActivityLogService] Error annotating log:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to annotate log' };
    }
  }

  /**
   * Delete an audit log
   */
  public async deleteLog(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('activity_logs')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete record' };
    }
  }

  /**
   * Realtime subscription for changes to activity_logs
   */
  public subscribeToActivityLogs(callback: () => void): () => void {
    const channelName = `realtime_audit_logs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = this.client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => callback())
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

export const activityLogService = new ActivityLogService();
