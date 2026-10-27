import React, { useState, useEffect } from 'react';
import { SettlementCustomer } from '../../types/auctionDetail';
import { settlementService } from '../../services/settlementService';
import { Save, X, AlertCircle, Loader2, Check } from 'lucide-react';

export interface PaymentCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: SettlementCustomer;
  auctionId: string;
  onPaymentSuccess?: () => void;
}

export const PaymentCashierModal: React.FC<PaymentCashierModalProps> = ({
  isOpen,
  onClose,
  customer,
  auctionId,
  onPaymentSuccess
}) => {
  const [paymentType, setPaymentType] = useState('Select Account');
  const [paymentAmount, setPaymentAmount] = useState('0.00');
  const [rounding, setRounding] = useState('N/A');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen && customer) {
      setPaymentType('Select Account');
      const due = customer.balance !== undefined ? customer.balance : 0;
      setPaymentAmount(due > 0 ? due.toFixed(2) : '0.00');
      setRounding('N/A');
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, customer]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !customer) return null;

  const amountDue = (customer.balance !== undefined ? customer.balance : 0).toFixed(2);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (paymentType === 'Select Account' || !paymentType) {
      setErrorMsg('Please select a Payment Type account.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt < 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const remainingBalance = Math.max(0, (customer.balance || 0) - amt);
      const isFullyPaid = remainingBalance <= 0;

      await settlementService.updateInvoice(auctionId, customer.id, {
        paymentStatus: isFullyPaid ? 'Paid' : (customer.invoiceStatus as any || 'Pending'),
        paymentMethod: paymentType === 'check written' ? 'Check Written' : (paymentType === 'cash' ? 'Cash' : paymentType),
        balance: remainingBalance,
        notes: `[Payment Cashier] ${paymentType}: $${amt.toFixed(2)}${notes ? ' - ' + notes : ''}`.trim()
      });

      // Update in memory customer balance
      customer.balance = remainingBalance;
      if (isFullyPaid) {
        customer.invoiceStatus = 'Paid';
      }

      onPaymentSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record customer payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
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
          maxWidth: 540,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'paymentModalFadeIn 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes paymentModalFadeIn {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#334155',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            PAYMENT
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} style={{ padding: '24px 24px 20px' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 13,
                marginBottom: 16
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Payment Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Payment Type
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              >
                <option value="Select Account">Select Account</option>
                <option value="check written">check written</option>
                <option value="cash">cash</option>
                <option value="credit card">credit card</option>
                <option value="wire transfer">wire transfer</option>
              </select>
            </div>

            {/* Amount Due */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Amount Due
              </label>
              <input
                type="text"
                readOnly
                value={amountDue}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  background: '#f8fafc',
                  color: '#475569',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Payment Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Rounding */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Rounding
              </label>
              <input
                type="text"
                readOnly
                value={rounding}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  background: '#f8fafc',
                  color: '#475569',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'flex-start', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', paddingTop: 8 }}>
                Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Action Buttons matching screenshot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 24,
              paddingTop: 16
            }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-payment-modal-save"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #0f172a',
                borderRadius: 4,
                padding: '0 20px',
                height: 38,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.05))',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.borderColor = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = '#0f172a';
                  e.currentTarget.style.borderColor = '#0f172a';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>SAVE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              id="btn-payment-modal-cancel"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                padding: '8px 12px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
              }}
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
