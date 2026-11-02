export interface EmailSubscriber {
  id: string;
  user_id: string | null;
  email: string;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'unsubscribed';
  source?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  message: string;
  auction_id?: string | null;
  auction_title?: string | null;
  catalog_url?: string | null;
  recipient_count: number;
  successful_sends: number;
  failed_sends: number;
  status: 'sent' | 'partial' | 'failed' | 'draft';
  sent_at: string;
  recipients: string[];
  failure_details?: Array<{ email: string; reason: string }>;
}

export interface EmailListKPIs {
  totalSubscribers: number;
  activeSubscribers: number;
  newSubscribers30d: number;
  unsubscribedCount: number;
}

