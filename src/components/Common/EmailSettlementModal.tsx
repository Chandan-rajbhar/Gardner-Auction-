import React, { useState, useEffect } from 'react';
import { SettlementCustomer } from '../../types/auctionDetail';
import { settlementService } from '../../services/settlementService';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface EmailSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: SettlementCustomer | null;
  auctionTitle?: string;
  auctionCode?: string;
  onSuccess?: () => void;
}

export const EmailSettlementModal: React.FC<EmailSettlementModalProps> = ({
  isOpen,
  onClose,
  customer,
  auctionTitle = 'Spring Collector Auction — Session I',
  auctionCode = 'AUC-001',
  onSuccess
}) => {
  const { user } = useAuth();
  const dynamicUserEmail = user?.email || 'admin@gardnerauction.com';

  const [to, setTo] = useState('');
  const [replyTo, setReplyTo] = useState(dynamicUserEmail);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync state whenever customer or modal opens
  useEffect(() => {
    if (customer && isOpen) {
      const resolvedTitle = auctionTitle || 'Spring Collector Auction — Session I';
      const resolvedCode = auctionCode || 'AUC-001';
      const currentSenderEmail = user?.email || 'admin@gardnerauction.com';

      setTo('');
      setReplyTo(currentSenderEmail);
      setBcc('');
      setSubject(`Settlement - ${resolvedTitle}`);
      setErrorMsg(null);
      setIsSuccess(false);

      const secureLink = `https://gardnerauction.com/portal/settlement/${customer.id || customer.invoiceNumber}`;
      const invoiceNum = customer.invoiceNumber || `INV-GA-2026-${customer.bidderNumber}`;
      const lotCnt = customer.lotCount || customer.lots?.length || 1;
      const formattedBalance = customer.balance !== undefined ? Number(customer.balance).toFixed(2) : '0.00';

      const message = `Dear ${customer.name},

Please find attached your official settlement statement for ${resolvedTitle} (${resolvedCode}).

Settlement Summary:
• Customer / Paddle: #${customer.bidderNumber} (${customer.name})
• Invoice Number: ${invoiceNum}
• Lot Count: ${lotCnt}
• Total Balance Due: $${formattedBalance}
• Payment Status: ${customer.invoiceStatus || 'Pending'}
• Shipping Requested: ${customer.shippingRequested ? 'Yes' : 'No'}

View and download your complete itemized statement:
${secureLink}

If you have questions regarding wire payment routing or shipping dispatch, reply directly to this message or call our clerking office at +1 (406) 541-4400.

Sincerely,
Gardner Auction Settlement & Consignor Clerking Services`;

      setBody(message);
    }
  }, [customer, isOpen, auctionTitle, auctionCode, user?.email]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSending, onClose]);

  if (!isOpen || !customer) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanTo = to.trim();
    if (!cleanTo) {
      setErrorMsg('Please enter a recipient email address.');
      return;
    }
    if (!emailRegex.test(cleanTo)) {
      setErrorMsg('Please enter a valid recipient email address.');
      return;
    }
    if (cleanTo.toLowerCase().endsWith('@example.com') || cleanTo.toLowerCase().includes('example.com')) {
      setErrorMsg('Please enter a real email address (example.com placeholder addresses are not permitted).');
      return;
    }
    if (bcc.trim() && !emailRegex.test(bcc.trim())) {
      setErrorMsg('Please enter a valid BCC email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject.');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Email message body cannot be empty.');
      return;
    }

    setIsSending(true);

    try {
      const result = await settlementService.sendSettlementEmail({
        to: cleanTo,
        replyTo: replyTo.trim() || dynamicUserEmail,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        customerName: customer.name,
        paddleNumber: customer.bidderNumber,
        invoiceNumber: customer.invoiceNumber || `INV-${customer.bidderNumber}`,
        auctionTitle: auctionTitle || 'Spring Collector Auction — Session I',
        settlementLink: `https://gardnerauction.com/portal/settlement/${customer.id || customer.invoiceNumber}`
      });

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1100);
      } else {
        setErrorMsg(result.error || 'Failed to dispatch email. Please check email provider configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while dispatching the settlement email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'modalSlideIn 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#fdfaf3',
                color: 'var(--gold-primary, #a37a3b)',
                border: '1px solid #f0e6d2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Email Settlement Statement
              </h3>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                Recipient: <strong style={{ color: '#0f172a', fontWeight: 600 }}>{customer.name}</strong> (Paddle #{customer.bidderNumber})
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: isSending ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: 12.5,
                  lineHeight: 1.5
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#dc2626' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2, color: '#991b1b' }}>Email Delivery Failed</div>
                  <div style={{ color: '#7f1d1d' }}>{errorMsg}</div>
                </div>
              </div>
            )}

            {isSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} />
                <span>Settlement statement successfully sent!</span>
              </div>
            )}

            {/* To Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                To (Customer Email) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  color: '#0f172a',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#0f172a'; }}
                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
              />
            </div>

            {/* Reply To & BCC Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Reply To
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder={dynamicUserEmail || 'admin@gardnerauction.com'}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0f172a'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  BCC (Optional)
                </label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="compliance@gardnerauction.com"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0f172a'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                />
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Subject <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Settlement - Auction Name"
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#0f172a'; }}
                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
              />
            </div>

            {/* Message Body Field */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Message Body
              </label>
              <textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12.5,
                  lineHeight: '1.55',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  color: '#0f172a',
                  resize: 'vertical',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#0f172a'; }}
                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              style={{
                height: 36,
                padding: '0 18px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSending ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s, border-color 0.15s'
              }}
              onMouseEnter={(e) => {
                if (!isSending) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSending) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSending || isSuccess}
              style={{
                height: 36,
                padding: '0 20px',
                borderRadius: 6,
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: isSending || isSuccess ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.05))',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                  if (!isSending && !isSuccess) {
                    e.currentTarget.style.background = '#1e293b';
                    e.currentTarget.style.borderColor = '#1e293b';
                  }
                }
              }
              onMouseLeave={(e) => {
                  if (!isSending && !isSuccess) {
                    e.currentTarget.style.background = '#0f172a';
                    e.currentTarget.style.borderColor = '#0f172a';
                  }
                }
              }
            >
              {isSending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Settlement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
