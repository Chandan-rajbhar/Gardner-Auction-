import React, { useState, useEffect } from 'react';
import { SettlementCustomer } from '../../types/auctionDetail';
import { settlementService } from '../../services/settlementService';
import { paymentService, PAYPAL_ME_BASE_URL } from '../../services/paymentService';
import { Save, X, AlertCircle, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';

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

  // PayPal Specific State
  const [paypalRef, setPaypalRef] = useState('');
  const [paypalStatus, setPaypalStatus] = useState<'Pending' | 'Successful'>('Pending');
  const [paypalOpened, setPaypalOpened] = useState(false);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen && customer) {
      const due = customer.balance !== undefined ? customer.balance : 0;
      const hasCredit = customer.depositRemaining !== undefined && customer.depositRemaining > 0;
      if (hasCredit && (customer.depositRemaining || 0) >= due && due > 0) {
        setPaymentType('Apply Deposit Credit');
      } else {
        setPaymentType('Select Account');
      }
      const initialAmt = due > 0 ? due.toFixed(2) : '0.00';
      setPaymentAmount(initialAmt);
      setRounding('N/A');
      setNotes('');
      setErrorMsg(null);
      setPaypalOpened(false);
      setPaypalStatus('Pending');
      setPaypalRef(paymentService.generateReferenceNumber('INV', customer.bidderNumber));
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
  const parsedAmt = parseFloat(paymentAmount) || 0;
  const isPayPal = paymentType === 'PayPal (Online Payment)';

  const handlePaypalClick = () => {
    paymentService.openPayPalPaymentWindow(parsedAmt > 0 ? parsedAmt : parseFloat(amountDue));
    setPaypalOpened(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (paymentType === 'Select Account' || !paymentType) {
      setErrorMsg('Please select a Payment Type account.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than $0.00.');
      return;
    }

    if (paymentType === 'Apply Deposit Credit') {
      const avail = customer.depositRemaining || 0;
      if (amt > avail) {
        setErrorMsg(`Payment amount (${amt.toFixed(2)}) exceeds available deposit credit (${avail.toFixed(2)}).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isPayPal) {
        // --- PAYPAL ONLINE PAYMENT WORKFLOW ---
        const refToUse = paypalRef.trim() || paymentService.generateReferenceNumber('INV', customer.bidderNumber);
        const res = await paymentService.recordInvoicePayPalPayment({
          auctionId,
          invoiceId: customer.id,
          customerId: customer.id,
          amount: amt,
          referenceNumber: refToUse,
          notes: notes,
          status: paypalStatus,
          adminName: 'Cashier Desk'
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to record PayPal payment.');
          setIsSubmitting(false);
          return;
        }

        if (res.balance !== undefined) {
          customer.balance = res.balance;
          customer.invoiceStatus = res.invoiceStatus as any;
          if (res.depositApplied !== undefined) {
            customer.depositApplied = res.depositApplied;
          }
          if (res.depositRemaining !== undefined) {
            customer.depositRemaining = res.depositRemaining;
          }
          if (res.paymentsReceived !== undefined) {
            customer.paymentsReceived = res.paymentsReceived;
          }
          if (res.payment) {
            customer.payments = [...(customer.payments || []), res.payment];
          }
        }
      } else {
        // --- STANDARD PAYMENT METHODS WORKFLOW ---
        const resolvedPaymentType = paymentType === 'check written' ? 'Check Written' : (paymentType === 'cash' ? 'Cash' : paymentType);
        const res = await settlementService.recordCustomerPayment(auctionId, customer.id, {
          amount: amt,
          paymentType: resolvedPaymentType,
          notes: notes || '',
          status: 'Successful'
        });

        if (res && res.balance !== undefined) {
          customer.balance = res.balance;
          customer.invoiceStatus = res.invoiceStatus as any;
          if (res.depositApplied !== undefined) {
            customer.depositApplied = res.depositApplied;
          }
          if (res.depositRemaining !== undefined) {
            customer.depositRemaining = res.depositRemaining;
          }
          if (res.paymentsReceived !== undefined) {
            customer.paymentsReceived = res.paymentsReceived;
          }
          if (res.payment) {
            customer.payments = [...(customer.payments || []), res.payment];
          }
        } else {
          const remainingBalance = Math.max(0, (customer.balance || 0) - amt);
          customer.balance = remainingBalance;
          if (remainingBalance <= 0) {
            customer.invoiceStatus = 'Paid';
          }
        }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            {isPayPal && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#003087',
                  color: '#ffffff',
                  letterSpacing: '0.02em'
                }}
              >
                PayPal Online
              </span>
            )}
          </div>

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
                id="select-settlement-payment-type"
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 4,
                  border: isPayPal ? '1.5px solid #0070ba' : '1px solid #cbd5e1',
                  fontSize: 13,
                  background: isPayPal ? '#f0f9ff' : '#ffffff',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontWeight: isPayPal ? 600 : 400
                }}
              >
                <option value="Select Account">Select Account</option>
                {Boolean(customer.depositRemaining && customer.depositRemaining > 0) && (
                  <option value="Apply Deposit Credit" style={{ fontWeight: 600, color: '#15803d' }}>
                    Apply Deposit Credit (${customer.depositRemaining?.toFixed(2)} Available)
                  </option>
                )}
                <option value="PayPal (Online Payment)" style={{ fontWeight: 700, color: '#0070ba' }}>
                  PayPal (Online Payment)
                </option>
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
                min="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                id="input-settlement-payment-amount"
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
                  outline: 'none',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600
                }}
              />
            </div>

            {/* PAYPAL SPECIAL WORKFLOW CONTAINER */}
            {isPayPal && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #bae6fd',
                  borderRadius: 6,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        background: '#003087',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontStyle: 'italic',
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      P
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                        PayPal.me / HighlanderGoldSilver
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Highlander Gold &amp; Silver Official Saleroom Account
                      </div>
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  <button
                    type="button"
                    onClick={handlePaypalClick}
                    id="btn-paypal-pay-now"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#0070ba',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#003087')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#0070ba')}
                  >
                    <span>Pay Now (${(parsedAmt > 0 ? parsedAmt : parseFloat(amountDue)).toFixed(2)})</span>
                    <ExternalLink size={13} />
                  </button>
                </div>

                {paypalOpened && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 11.5,
                      color: '#065f46',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <CheckCircle2 size={14} color="#059669" />
                    <span>PayPal link opened in new tab. Verify transaction status below.</span>
                  </div>
                )}

                {/* PayPal Transaction Reference */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    Reference / Ref #
                  </label>
                  <input
                    type="text"
                    required
                    value={paypalRef}
                    onChange={(e) => setPaypalRef(e.target.value)}
                    placeholder="e.g. PP-INV-..."
                    id="input-paypal-invoice-ref"
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}
                  />
                </div>

                {/* Payment Verification Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    Payment Status
                  </label>
                  <select
                    value={paypalStatus}
                    onChange={(e) => setPaypalStatus(e.target.value as any)}
                    id="select-paypal-payment-status"
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Pending">Pending Verification (Default for PayPal Link)</option>
                    <option value="Successful">Verified &amp; Successful (Deducts Balance Immediately)</option>
                  </select>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                  ℹ️ <strong>Admin Verification Policy:</strong> Selecting <em>Pending Verification</em> stores this payment in history without adjusting customer balance until funds are verified. Selecting <em>Verified &amp; Successful</em> immediately deducts the payment from customer balance and updates settlement ledger.
                </div>
              </div>
            )}

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
                placeholder="Receipt details, transaction ID, cashier memo..."
                id="textarea-settlement-payment-notes"
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
