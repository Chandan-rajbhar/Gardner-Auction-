export function parsePaymentsFromNotes(notes) {
  if (!notes) return [];

  const marker = '[PAYMENTS_DATA]:';
  const markerIdx = notes.indexOf(marker);
  if (markerIdx !== -1) {
    try {
      const rest = notes.slice(markerIdx + marker.length);
      const endIdx = rest.indexOf('\n');
      const jsonStr = endIdx === -1 ? rest.trim() : rest.slice(0, endIdx).trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({
          id: String(p.id || `pay-${Math.random().toString(36).slice(2, 6)}`),
          amount: Number(p.amount) || 0,
          method: String(p.method || 'Credit Card'),
          date: String(p.date || new Date().toISOString().split('T')[0]),
          notes: String(p.notes || ''),
          status: p.status || 'Successful'
        }));
      }
    } catch (_) {}
  }

  const legacyRegex = /\[Payment Cashier\]\s*([^:\n]+):\s*\$([0-9,.]+)(?:\s*-\s*([^\n]*))?/gi;
  const legacyPayments = [];
  let match;
  let idx = 0;
  while ((match = legacyRegex.exec(notes)) !== null) {
    const method = match[1]?.trim() || 'Cashier';
    const amount = parseFloat(match[2].replace(/,/g, '')) || 0;
    const noteText = match[3]?.trim() || '';
    if (amount > 0) {
      legacyPayments.push({
        id: `legacy-pay-${idx++}`,
        amount,
        method,
        date: new Date().toISOString().split('T')[0],
        notes: noteText,
        status: 'Successful'
      });
    }
  }

  return legacyPayments;
}

export function serializePaymentsToNotes(payments, originalNotes) {
  const marker = '[PAYMENTS_DATA]:';
  let cleanedNotes = originalNotes || '';
  if (cleanedNotes.includes(marker)) {
    cleanedNotes = cleanedNotes
      .split('\n')
      .filter(line => !line.startsWith(marker))
      .join('\n')
      .trim();
  }

  const jsonLine = `${marker}${JSON.stringify(payments)}`;
  if (!cleanedNotes) {
    return jsonLine;
  }
  return `${jsonLine}\n${cleanedNotes}`;
}

export function calculateFinancials({ lots, charges = [], shippingFee = 0, taxAmount = 0, deposits = [], payments = [] }) {
  const lotSubtotal = Math.round(
    (lots || []).reduce((sum, l) => sum + (l.entries || []).reduce((eSum, e) => eSum + (Number(e.amount) || 0), 0), 0) * 100
  ) / 100;

  const additionalCharges = Math.round(
    (charges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0) * 100
  ) / 100;

  const totalDue = Math.round((lotSubtotal + additionalCharges + Number(shippingFee || 0) + Number(taxAmount || 0)) * 100) / 100;

  const activeDeposits = (deposits || []).filter(d => d.status !== 'Refunded');
  const totalDepositAvailable = Math.round(
    activeDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) * 100
  ) / 100;

  const depositApplied = Math.round(Math.min(lotSubtotal, totalDepositAvailable) * 100) / 100;
  const depositRemaining = Math.max(0, Math.round((totalDepositAvailable - depositApplied) * 100) / 100);

  const successfulPayments = Math.round(
    (payments || [])
      .filter(p => !p.status || p.status === 'Successful' || p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100
  ) / 100;

  const rawBalance = Math.round((totalDue - depositApplied - successfulPayments) * 100) / 100;
  const balance = Math.max(0, rawBalance);
  const invoiceStatus = balance === 0 ? 'Paid' : 'Pending';

  return {
    lotSubtotal,
    additionalCharges,
    shippingFee,
    taxAmount,
    totalDue,
    depositApplied,
    depositRemaining,
    successfulPayments,
    balance,
    invoiceStatus
  };
}

// RUN TESTS
console.log('Running test suite...');

// Test 1: Full deposit $672.75
const t1 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }, { amount: 87.75 }] }],
  deposits: [{ amount: 672.75, status: 'Collected' }],
  payments: []
});
console.log('Test 1 (Full deposit 672.75):', t1.balance === 0, 'Balance:', t1.balance, 'Status:', t1.invoiceStatus);

// Test 2: Deposit is only $200.00
const t2 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }, { amount: 87.75 }] }],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: []
});
console.log('Test 2 (Deposit only 200.00):', t2.balance === 472.75, 'Balance:', t2.balance, 'Status:', t2.invoiceStatus);

// Test 3: Additional payment of $100.00
const t3 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }, { amount: 87.75 }] }],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: [{ amount: 100, status: 'Successful' }]
});
console.log('Test 3 (+100 payment):', t3.balance === 372.75, 'Balance:', t3.balance, 'Status:', t3.invoiceStatus);

// Test 4: Add charge of $50
const t4 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }, { amount: 87.75 }] }],
  charges: [{ amount: 50 }],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: [{ amount: 100, status: 'Successful' }]
});
console.log('Test 4 (+50 charge):', t4.balance === 422.75, 'Balance:', t4.balance);

// Test 5: Delete charge
const t5 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }, { amount: 87.75 }] }],
  charges: [],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: [{ amount: 100, status: 'Successful' }]
});
console.log('Test 5 (charge deleted):', t5.balance === 372.75, 'Balance:', t5.balance);

// Test 6: Refund lot entry (87.75)
const t6 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }] }],
  charges: [],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: [{ amount: 100, status: 'Successful' }]
});
console.log('Test 6 (BP refunded):', t6.balance === 285.00, 'Balance:', t6.balance);

// Test 7: Final payment of 285
const t7 = calculateFinancials({
  lots: [{ entries: [{ amount: 585 }] }],
  charges: [],
  deposits: [{ amount: 200, status: 'Collected' }],
  payments: [{ amount: 100, status: 'Successful' }, { amount: 285, status: 'Successful' }]
});
console.log('Test 7 (Final payment 285):', t7.balance === 0, 'Balance:', t7.balance, 'Status:', t7.invoiceStatus);

// Test 8: Serialization & Deserialization of payments
const initialPayments = [{ id: 'p1', amount: 100, method: 'Check', date: '2026-11-03', status: 'Successful' }];
const serialized = serializePaymentsToNotes(initialPayments, 'Deposit Applied: $200.00');
const parsed = parsePaymentsFromNotes(serialized);
console.log('Test 8 (Serialization):', parsed.length === 1 && parsed[0].amount === 100);
