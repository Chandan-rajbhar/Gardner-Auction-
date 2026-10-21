import React, { useState } from 'react';
import { 
  NavigationSection, 
  Auction, 
  LotItem, 
  UserBidder, 
  LiveBid, 
  InvoiceSettlement, 
  ConsignorSettlement, 
  ActivityLog 
} from './types';
import { 
  INITIAL_AUCTIONS, 
  INITIAL_LOTS, 
  INITIAL_USERS, 
  INITIAL_BIDS, 
  INITIAL_INVOICES, 
  INITIAL_CONSIGNOR_SETTLEMENTS, 
  INITIAL_LOGS 
} from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { OverviewView } from './components/views/OverviewView';
import { UsersView } from './components/views/UsersView';
import { AuctionsView } from './components/views/AuctionsView';
import { LotsView } from './components/views/LotsView';
import { LiveClerkingView } from './components/views/LiveClerkingView';
import { PaymentsView } from './components/views/PaymentsView';
import { ReportsView } from './components/views/ReportsView';
import { LogsView } from './components/views/LogsView';
import { SettingsView } from './components/views/SettingsView';
import { CheckCircle2, RefreshCw, X, Radio } from 'lucide-react';
import { recordBidToSupabase } from './lib/supabase';

const AdminConsole: React.FC = () => {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavigationSection>('overview');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>('auc-001');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStep, setSyncStep] = useState(0);

  // Application Data States
  const [auctions, setAuctions] = useState<Auction[]>(INITIAL_AUCTIONS);
  const [lots, setLots] = useState<LotItem[]>(INITIAL_LOTS);
  const [bidders, setBidders] = useState<UserBidder[]>(INITIAL_USERS);
  const [bids, setBids] = useState<LiveBid[]>(INITIAL_BIDS);
  const [invoices, setInvoices] = useState<InvoiceSettlement[]>(INITIAL_INVOICES);
  const [consignors, setConsignors] = useState<ConsignorSettlement[]>(INITIAL_CONSIGNOR_SETTLEMENTS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);

  const [activeLotId, setActiveLotId] = useState<string>('lot-001');
  const currentAuction = auctions.find(a => a.id === selectedAuctionId) || auctions[0];
  const activeLotOnBlock = lots.find(l => l.id === activeLotId) || lots.find(l => l.status === 'on_block') || lots[0];

  const currentAdminName = user?.name || 'Todd Gardner';

  // HiBid AF360 Sync Simulation
  const triggerHiBidSync = () => {
    setIsSyncModalOpen(true);
    setSyncStep(1);

    setTimeout(() => setSyncStep(2), 700);
    setTimeout(() => setSyncStep(3), 1400);
    setTimeout(() => {
      setSyncStep(4);
      // Log sync
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        adminUser: currentAdminName,
        action: 'Manual HiBid AF360 Full Sync Completed',
        category: 'HiBid Sync',
        severity: 'success',
        details: 'Synchronized catalog entries, reserve modifications, and floor check-ins to all HiBid syndication nodes.'
      };
      setLogs(prev => [newLog, ...prev]);
    }, 2100);
  };

  // Live Clerking Bid Handler
  const handlePlaceBid = (amount: number, paddleNumber: string, bidderName: string, source: LiveBid['source']) => {
    if (!activeLotOnBlock) return;

    const newBid: LiveBid = {
      id: `bid-${Date.now()}`,
      lotId: activeLotOnBlock.id,
      lotNumber: activeLotOnBlock.lotNumber,
      amount,
      paddleNumber,
      bidderName,
      source,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isWinning: true
    };

    setBids(prev => [newBid, ...prev.map(b => ({ ...b, isWinning: false }))]);

    setLots(prev => prev.map(lot => {
      if (lot.id === activeLotOnBlock.id) {
        return {
          ...lot,
          currentBid: amount,
          highBidderPaddle: paddleNumber,
          highBidderName: bidderName,
          bidsCount: lot.bidsCount + 1,
          status: 'on_block'
        };
      }
      return lot;
    }));

    // Asynchronously synchronize bid to Supabase & Edge Function
    recordBidToSupabase({
      lotId: activeLotOnBlock.id,
      lotNumber: activeLotOnBlock.lotNumber,
      amount,
      paddleNumber,
      bidderName,
      source
    });

    // Audit log
    const audit: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      adminUser: currentAdminName,
      action: `Accepted ${source} Bid: $${amount.toLocaleString()} on Lot #${activeLotOnBlock.lotNumber}`,
      category: 'Clerking',
      severity: 'info',
      details: `Paddle #${paddleNumber} (${bidderName}) advanced the bid via ${source}. Synced with Supabase Edge.`
    };
    setLogs(prev => [audit, ...prev]);
  };

  // Hammer Down / Sold Handler
  const handleHammerSold = (lotId: string, finalAmount: number, winningPaddle: string, overrideReserve?: boolean) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot) return;

    const winner = bidders.find(b => b.paddleNumber === winningPaddle) || {
      name: `Bidder #${winningPaddle}`,
      email: `paddle${winningPaddle}@gardner-auction.com`
    };

    // Calculate premium (15% cash/wire standard)
    const buyersPremium = finalAmount * 0.15;
    const taxAmount = finalAmount * 0.075;
    const shippingFee = 250.00;
    const totalDue = finalAmount + buyersPremium + taxAmount + shippingFee;

    const newInvoice: InvoiceSettlement = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-GA-2026-${Math.floor(8000 + Math.random() * 1999)}`,
      auctionId: currentAuction.id,
      auctionCode: currentAuction.code,
      paddleNumber: winningPaddle,
      buyerName: winner.name,
      buyerEmail: winner.email,
      itemsCount: 1,
      lots: [{ lotNumber: lot.lotNumber, title: lot.title, hammerPrice: finalAmount }],
      hammerSubtotal: finalAmount,
      buyersPremium,
      taxAmount,
      shippingFee,
      totalDue,
      paymentStatus: 'Pending Wire',
      notes: `Won on block via gavel fall at ${new Date().toLocaleTimeString()}.${overrideReserve ? ' Authorized consignor reserve override applied.' : ''}`
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // Mark lot sold (do NOT auto-advance; auctioneer advances explicitly)
    setLots(prev => prev.map(l => {
      if (l.id === lotId) {
        return { ...l, status: 'sold', hammerPrice: finalAmount };
      }
      return l;
    }));

    // Update bidder spending
    setBidders(prev => prev.map(b => {
      if (b.paddleNumber === winningPaddle) {
        return {
          ...b,
          lotsWon: b.lotsWon + 1,
          totalSpent: b.totalSpent + totalDue
        };
      }
      return b;
    }));

    // Log sale
    const audit: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      adminUser: currentAdminName,
      action: `HAMMER DOWN! Lot #${lot.lotNumber} SOLD for $${finalAmount.toLocaleString()}`,
      category: 'Clerking',
      severity: 'success',
      details: `Sold to Paddle #${winningPaddle} (${winner.name}). Invoice #${newInvoice.invoiceNumber} generated.${overrideReserve ? ' (Reserve override authorized)' : ''}`
    };
    setLogs(prev => [audit, ...prev]);
  };

  // Pass Lot Handler
  const handlePassLot = (lotId: string, reason: string = 'Reserve Not Met') => {
    setLots(prev => prev.map(l => {
      if (l.id === lotId) {
        return { ...l, status: 'passed', passReason: reason };
      }
      return l;
    }));

    const lot = lots.find(l => l.id === lotId);
    const audit: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      adminUser: currentAdminName,
      action: `Lot #${lot?.lotNumber} PASSED (${reason})`,
      category: 'Clerking',
      severity: 'warning',
      details: `Lot #${lot?.lotNumber} passed as unsold. Reason: ${reason}. Highest bid was $${(lot?.currentBid || 0).toLocaleString()} vs Reserve $${(lot?.reservePrice || 0).toLocaleString()}.`
    };
    setLogs(prev => [audit, ...prev]);
  };

  // Reopen Lot Handler
  const handleReopenLot = (lotId: string) => {
    setLots(prev => prev.map(l => {
      if (l.id === lotId) {
        return { ...l, status: 'on_block' };
      }
      return l;
    }));

    const lot = lots.find(l => l.id === lotId);
    const audit: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      adminUser: currentAdminName,
      action: `Rostrum Reopened for Lot #${lot?.lotNumber}`,
      category: 'Clerking',
      severity: 'warning',
      details: `Lot #${lot?.lotNumber} status changed back to on_block for continued bidding.`
    };
    setLogs(prev => [audit, ...prev]);
  };

  // Next Catalog Lot Handler
  const handleNextLot = () => {
    const currentIndex = lots.findIndex(l => l.id === activeLotOnBlock?.id);
    const nextLot = lots.slice(currentIndex + 1).find(l => l.status === 'upcoming') || 
                    lots.find(l => l.status === 'upcoming' && l.id !== activeLotOnBlock?.id);

    if (nextLot) {
      setActiveLotId(nextLot.id);
      setLots(prev => prev.map(l => {
        if (l.id === nextLot.id) {
          return { ...l, status: 'on_block' };
        }
        return l;
      }));
    } else {
      alert('All catalog lots for this session have been presented on the rostrum block!');
    }
  };

  const handleSendToBlock = (lot: LotItem) => {
    setActiveLotId(lot.id);
    setLots(prev => prev.map(l => {
      if (l.id === lot.id) {
        return { ...l, status: 'on_block' };
      }
      if (l.status === 'on_block') {
        return { ...l, status: 'upcoming' };
      }
      return l;
    }));
    setCurrentSection('live_clerking');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar 
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        liveLotsCount={lots.filter(l => l.status === 'on_block' || l.status === 'upcoming').length}
        pendingVerifications={bidders.filter(b => b.status === 'pending_verification').length}
      />

      {/* Main App Body */}
      <div className="main-wrapper">
        <Topbar 
          currentSection={currentSection}
          auctions={auctions}
          selectedAuctionId={selectedAuctionId}
          onSelectAuction={setSelectedAuctionId}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onTriggerHiBidSync={triggerHiBidSync}
          isSyncing={isSyncModalOpen && syncStep < 4}
          unreadLogsCount={logs.filter(l => l.severity === 'warning' || l.severity === 'alert').length}
          onOpenNotifications={() => setCurrentSection('logs')}
        />

        <main className="content-body">
          {currentSection === 'overview' && (
            <OverviewView 
              auction={currentAuction}
              lots={lots}
              bidders={bidders}
              onNavigate={setCurrentSection}
              onSyncHiBid={triggerHiBidSync}
            />
          )}

          {currentSection === 'users' && (
            <UsersView 
              users={bidders}
              onUpdateUser={(updated) => setBidders(prev => prev.map(u => u.id === updated.id ? updated : u))}
              onAddUser={(newUser) => setBidders(prev => [newUser, ...prev])}
            />
          )}

          {currentSection === 'auctions' && (
            <AuctionsView 
              auctions={auctions}
              selectedAuctionId={selectedAuctionId}
              onSelectAuction={setSelectedAuctionId}
              onAddAuction={(newAuc) => setAuctions(prev => [newAuc, ...prev])}
              onNavigate={setCurrentSection}
              onSyncHiBid={triggerHiBidSync}
            />
          )}

          {currentSection === 'lots' && (
            <LotsView 
              lots={lots}
              onAddLot={(newLot) => setLots(prev => [newLot, ...prev])}
              onUpdateLot={(updated) => setLots(prev => prev.map(l => l.id === updated.id ? updated : l))}
              onSendToBlock={handleSendToBlock}
            />
          )}

          {currentSection === 'live_clerking' && (
            <LiveClerkingView 
              currentLot={activeLotOnBlock}
              allLots={lots}
              bids={bids.filter(b => b.lotId === activeLotOnBlock?.id || b.lotNumber === activeLotOnBlock?.lotNumber)}
              allBids={bids}
              bidders={bidders}
              onPlaceBid={handlePlaceBid}
              onHammerSold={handleHammerSold}
              onPassLot={handlePassLot}
              onReopenLot={handleReopenLot}
              onNextLot={handleNextLot}
              onSelectLot={(lotId) => {
                setActiveLotId(lotId);
                setLots(prev => prev.map(l => l.id === lotId ? { ...l, status: 'on_block' } : l.status === 'on_block' ? { ...l, status: 'upcoming' } : l));
              }}
            />
          )}

          {currentSection === 'payments' && (
            <PaymentsView 
              invoices={invoices}
              consignorSettlements={consignors}
              onUpdateInvoiceStatus={(id, status) => {
                setInvoices(prev => prev.map(i => i.id === id ? { ...i, paymentStatus: status } : i));
              }}
              onUpdateConsignorStatus={(id, status) => {
                setConsignors(prev => prev.map(c => c.id === id ? { ...c, status, checkNumber: `CHK-${Math.floor(900000 + Math.random() * 99999)}` } : c));
              }}
            />
          )}

          {currentSection === 'reports' && (
            <ReportsView 
              auction={currentAuction}
              lots={lots}
            />
          )}

          {currentSection === 'logs' && (
            <LogsView 
              logs={logs}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* HiBid AF360 Sync Progress Modal */}
      {isSyncModalOpen && (
        <div className="modal-overlay" onClick={() => syncStep === 4 && setIsSyncModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-serif">HiBid Network Synchronization</h3>
              {syncStep === 4 && (
                <button className="icon-btn" onClick={() => setIsSyncModalOpen(false)}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: syncStep >= 1 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {syncStep > 1 ? <CheckCircle2 size={16} color="#059669" /> : <RefreshCw size={16} className="animate-spin" color="var(--gold-primary)" />}
                  <span>Connecting to HiBid API Gateway...</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: syncStep >= 2 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {syncStep > 2 ? <CheckCircle2 size={16} color="#059669" /> : syncStep === 2 ? <RefreshCw size={16} className="animate-spin" color="var(--gold-primary)" /> : <div style={{ width: 16 }} />}
                  <span>Pushing Lot catalog revisions & PCGS cert images...</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: syncStep >= 3 ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {syncStep > 3 ? <CheckCircle2 size={16} color="#059669" /> : syncStep === 3 ? <RefreshCw size={16} className="animate-spin" color="var(--gold-primary)" /> : <div style={{ width: 16 }} />}
                  <span>Syncing bidder registrations across 5 portal nodes...</span>
                </div>

                {syncStep === 4 && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 14, borderRadius: 8, marginTop: 8 }}>
                    <div style={{ color: '#059669', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={18} /> HiBid Synchronized Successfully!
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      All lots, reserve parameters, and bidder approvals are now live on HiBid network and Gardner Auction saleroom.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {syncStep === 4 && (
              <div className="modal-footer">
                <button className="btn btn-gold" onClick={() => setIsSyncModalOpen(false)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ToastProvider>
  );
};

const AppRoot: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="brand-crest" style={{ width: 56, height: 56, fontSize: 28, animation: 'pulse 1.5s infinite' }}>
          G
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Gardner Auction AF360</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Verifying Rostrum Session Security...</div>
          <span className="auth-spinner" style={{ width: 24, height: 24, marginTop: 8 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AdminConsole />;
};

export default App;
