const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/auction/tabs/AuctionDayTab.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update State Declarations around lines 350
const targetState = `  // AF360 Live Clerking Workflow State
  const [customLots, setCustomLots] = useState<LotItem[]>(lots || []);
  const [clerkLotNumber, setClerkLotNumber] = useState<string>('1');
  const [clerkSeller, setClerkSeller] = useState<string>('');
  const [clerkTitle, setClerkTitle] = useState<string>('');
  const [clerkHammerPrice, setClerkHammerPrice] = useState<string>('');
  const [clerkBidderNumber, setClerkBidderNumber] = useState<string>('');
  const [clerkQuantity, setClerkQuantity] = useState<number>(1);
  const [clerkStatus, setClerkStatus] = useState<string>('Sold');
  const [clerkXMoney, setClerkXMoney] = useState<boolean>(false);
  const [clerkingAssist, setClerkingAssist] = useState<boolean>(true);
  const [isClerkingSaving, setIsClerkingSaving] = useState<boolean>(false);
  const [clerkingSearch, setClerkingSearch] = useState<string>('');
  const [clerkingPage, setClerkingPage] = useState<number>(1);
  const [clerkingPageSize, setClerkingPageSize] = useState<number>(20);
  const [selectedClerkingLotIds, setSelectedClerkingLotIds] = useState<Set<string>>(new Set());
  const [isClerkingStatsExpanded, setIsClerkingStatsExpanded] = useState<boolean>(false);`;

const replacementState = `  // AF360 Live Clerking Workflow State
  const [activeEventId, setActiveEventId] = useState<string>(() => selectedAuctionId || auction?.id || '');
  const [customLots, setCustomLots] = useState<LotItem[]>(lots || []);
  const [isLotsLoading, setIsLotsLoading] = useState<boolean>(false);
  const [clerkingStatusFilter, setClerkingStatusFilter] = useState<'all' | 'upcoming' | 'sold' | 'passed'>('all');
  const [inlineErrors, setInlineErrors] = useState<{
    lotNumber?: string;
    soldTo?: string;
    eventName?: string;
    hammerPrice?: string;
    bidderNumber?: string;
    quantity?: string;
  }>({});
  const [clerkLotNumber, setClerkLotNumber] = useState<string>('1');
  const [clerkSeller, setClerkSeller] = useState<string>('');
  const [clerkTitle, setClerkTitle] = useState<string>('');
  const [clerkHammerPrice, setClerkHammerPrice] = useState<string>('');
  const [clerkBidderNumber, setClerkBidderNumber] = useState<string>('');
  const [clerkQuantity, setClerkQuantity] = useState<number>(1);
  const [clerkStatus, setClerkStatus] = useState<string>('Sold');
  const [clerkXMoney, setClerkXMoney] = useState<boolean>(false);
  const [clerkingAssist, setClerkingAssist] = useState<boolean>(true);
  const [isClerkingSaving, setIsClerkingSaving] = useState<boolean>(false);
  const [clerkingSearch, setClerkingSearch] = useState<string>('');
  const [clerkingPage, setClerkingPage] = useState<number>(1);
  const [clerkingPageSize, setClerkingPageSize] = useState<number>(20);
  const [selectedClerkingLotIds, setSelectedClerkingLotIds] = useState<Set<string>>(new Set());
  const [isClerkingStatsExpanded, setIsClerkingStatsExpanded] = useState<boolean>(false);`;

// 2. Update auctionLots definition around lines 607
const targetAuctionLots = `  // Scoped lots for currently selected auction (strictly dynamic lots only)
  const auctionLots = useMemo(() => {
    if (!auction) return [];
    const baseLots = customLots.length > 0 ? customLots : (lots || []);
    return baseLots.filter(l => l.auctionId === auction.id && !l.id?.startsWith('lot-ref-'));
  }, [lots, customLots, auction?.id]);`;

const replacementAuctionLots = `  // Current active event ID for clerking desk
  const currentClerkEventId = activeEventId || selectedAuctionId || auction?.id || '';

  // Scoped lots for currently selected auction event (strictly dynamic lots only)
  const auctionLots = useMemo(() => {
    if (!currentClerkEventId) return [];
    const baseLots = customLots.length > 0 ? customLots : (lots || []);
    return baseLots.filter(l => (l.auctionId === currentClerkEventId || (l as any).auction_id === currentClerkEventId) && !l.id?.startsWith('lot-ref-'));
  }, [currentClerkEventId, customLots, lots]);

  // Synchronize activeEventId when external selectedAuctionId or auction changes
  useEffect(() => {
    if (!activeEventId && (selectedAuctionId || auction?.id)) {
      setActiveEventId(selectedAuctionId || auction?.id || '');
    }
  }, [selectedAuctionId, auction?.id, activeEventId]);

  // Load lots dynamically from Supabase whenever active event changes
  useEffect(() => {
    if (!currentClerkEventId) return;
    let isCancelled = false;
    setIsLotsLoading(true);
    lotsService.fetchLotsByAuction(currentClerkEventId)
      .then(fetched => {
        if (!isCancelled) {
          setCustomLots(fetched);
          if (fetched.length > 0) {
            const firstActive = fetched.find(l => l.status === 'on_block') || fetched[0];
            setClerkLotNumber(String(firstActive.lotNumber));
            setActiveClerkLotId(firstActive.id);
          } else {
            setClerkLotNumber('');
            setActiveClerkLotId('');
          }
        }
      })
      .catch(err => {
        console.error('[AuctionDayTab] Error fetching lots for active event:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLotsLoading(false);
      });

    return () => { isCancelled = true; };
  }, [currentClerkEventId]);

  // Handle switching auction event dynamically
  const handleSelectEvent = async (newEventId: string) => {
    if (!newEventId) return;
    setActiveEventId(newEventId);
    if (inlineErrors.eventName) {
      setInlineErrors(prev => ({ ...prev, eventName: undefined }));
    }
    if (onSelectAuction) {
      onSelectAuction(newEventId);
    }
    setIsLotsLoading(true);
    try {
      const fetched = await lotsService.fetchLotsByAuction(newEventId);
      setCustomLots(fetched);
      if (fetched.length > 0) {
        const firstActive = fetched.find(l => l.status === 'on_block') || fetched[0];
        setClerkLotNumber(String(firstActive.lotNumber));
        setActiveClerkLotId(firstActive.id);
      } else {
        setClerkLotNumber('');
        setActiveClerkLotId('');
      }
    } catch (err) {
      console.error('[AuctionDayTab] Error fetching lots for event:', err);
      showToast('error', 'Error', 'Failed to load lots for the selected event.');
    } finally {
      setIsLotsLoading(false);
    }
  };`;

// 3. Replace auctionTitleSelectOptions with dynamic auctionEventSelectOptions (no mock fallbacks)
const targetAuctionTitleSelectOptions = `  // Dynamic Auction Title Options for "Title" dropdown with Shadcn styling & search
  const auctionTitleSelectOptions = useMemo<ShadcnSelectOption[]>(() => {
    const list: ShadcnSelectOption[] = supabaseAuctions.map(a => ({
      value: a.title,
      label: a.title,
      badge: a.code,
      description: \`ID: \${a.id} • Status: \${a.status}\`
    }));

    // If clerkTitle has a custom value (e.g. from current lot) not yet in list, keep it visible
    if (clerkTitle && !list.some(o => o.value.toLowerCase() === clerkTitle.toLowerCase())) {
      list.unshift({
        value: clerkTitle,
        label: clerkTitle,
        badge: 'Lot Title'
      });
    }

    if (list.length === 0) {
      if (auction?.name) {
        return [{ value: auction.name, label: auction.name, badge: auction.code || 'AUC-001', description: \`ID: \${auction.id}\` }];
      }
      return [
        { value: 'Spring Collector Auction — Session I', label: 'Spring Collector Auction — Session I', badge: 'AUC-001', description: 'ID: auc-001' },
        { value: 'Test saurabh', label: 'Test saurabh', badge: 'SA4169', description: 'ID: auc-1792654367075' },
        { value: 'Test gold', label: 'Test gold', badge: 'sss44', description: 'ID: auc-1792664749020' }
      ];
    }

    return list;
  }, [supabaseAuctions, clerkTitle, auction?.name, auction?.code, auction?.id]);`;

const replacementAuctionEventSelectOptions = `  // Dynamic Auction Event Options for "Event Name" dropdown with Shadcn styling & search
  const auctionEventSelectOptions = useMemo<ShadcnSelectOption[]>(() => {
    return supabaseAuctions.map(a => ({
      value: a.id,
      label: a.title,
      badge: a.code,
      description: \`Status: \${a.status}\`
    }));
  }, [supabaseAuctions]);`;

// 4. Update selectedClerkLot and its synchronization effect
const targetSelectedClerkLotEffect = `  // Active selected lot in Clerking entry form
  const selectedClerkLot = useMemo(() => {
    const num = parseInt(clerkLotNumber, 10);
    if (!isNaN(num)) {
      const found = auctionLots.find(l => l.lotNumber === num);
      if (found) return found;
    }
    return currentBlockLot || auctionLots[0];
  }, [auctionLots, clerkLotNumber, currentBlockLot]);

  // When selectedClerkLot changes or active lot changes, synchronize form
  useEffect(() => {
    if (selectedClerkLot) {
      setClerkTitle(selectedClerkLot.title || (auction?.name || ''));
      const isSold = selectedClerkLot.status === 'sold';
      // "Sold To" is the buyer/winning bidder, NOT the consignor/seller
      const s = isSold
        ? ((selectedClerkLot as any).highBidderName || (selectedClerkLot as any).soldTo || '')
        : '';
      setClerkSeller(s);
      if (isSold) {
        setClerkHammerPrice(String(selectedClerkLot.hammerPrice || selectedClerkLot.currentBid || ''));
        setClerkBidderNumber(selectedClerkLot.highBidderPaddle || (selectedClerkLot as any).soldToBidderId || '');
        setClerkStatus('Sold');
      } else if (selectedClerkLot.status === 'passed') {
        setClerkHammerPrice('');
        setClerkBidderNumber('');
        setClerkStatus('Passed');
      } else {
        setClerkHammerPrice('');
        setClerkBidderNumber('');
        setClerkStatus('Sold');
      }
    }
  }, [selectedClerkLot?.id]);`;

const replacementSelectedClerkLotEffect = `  // Active selected lot in Clerking entry form
  const selectedClerkLot = useMemo(() => {
    const num = parseInt(clerkLotNumber, 10);
    if (!isNaN(num)) {
      const found = auctionLots.find(l => l.lotNumber === num);
      if (found) return found;
    }
    return currentBlockLot || auctionLots[0] || null;
  }, [auctionLots, clerkLotNumber, currentBlockLot]);

  // When selectedClerkLot changes or active lot changes, synchronize form
  useEffect(() => {
    if (selectedClerkLot) {
      setClerkTitle(selectedClerkLot.title || '');
      const isSold = selectedClerkLot.status === 'sold';
      // "Sold To" is the buyer/winning bidder, NOT the consignor/seller
      const buyerName = isSold
        ? ((selectedClerkLot as any).highBidderName || (selectedClerkLot as any).soldTo || '')
        : '';
      setClerkSeller(buyerName);
      if (isSold) {
        setClerkHammerPrice(String(selectedClerkLot.hammerPrice || selectedClerkLot.currentBid || ''));
        setClerkBidderNumber(selectedClerkLot.highBidderPaddle || (selectedClerkLot as any).soldToBidderId || '');
        setClerkStatus('Sold');
      } else if (selectedClerkLot.status === 'passed') {
        setClerkHammerPrice('');
        setClerkBidderNumber('');
        setClerkStatus('Passed');
      } else {
        setClerkHammerPrice('');
        setClerkBidderNumber('');
        setClerkStatus('Sold');
      }
    }
  }, [selectedClerkLot?.id]);`;

// 5. Update filteredClerkingLots and handleSaveClerking
const targetClerkingSection = `  // Filtered clerking lots for table
  const filteredClerkingLots = auctionLots.filter(l => {
    if (!clerkingSearch.trim()) return true;
    const q = clerkingSearch.toLowerCase();
    const s = (l.consignorName || (l as any).sellerName || (l as any).consignor_name || '').toLowerCase();
    const paddle = (l.highBidderPaddle || (l as any).soldToBidderId || '').toLowerCase();
    return l.lotNumber.toString().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      s.includes(q) ||
      paddle.includes(q);
  });

  // Handle Save Clerking Entry
  const handleSaveClerking = async () => {
    if (!auction) return;
    const parsedLotNum = parseInt(clerkLotNumber, 10);
    const targetLot = auctionLots.find(l => l.lotNumber === parsedLotNum);
    if (!targetLot) {
      showToast('error', 'Lot Not Found', \`Lot #\${clerkLotNumber} does not exist in this catalog.\`);
      return;
    }

    const isSold = clerkStatus === 'Sold';
    const isPassed = clerkStatus === 'Passed';
    const finalPrice = isSold ? parseFloat(clerkHammerPrice) : 0;
    const finalPaddle = isSold ? clerkBidderNumber.trim() : null;

    if (isSold) {
      if (isNaN(finalPrice) || finalPrice <= 0) {
        showToast('error', 'Validation Error', 'Please enter a valid Hammer Price greater than $0.');
        return;
      }
      if (!finalPaddle) {
        showToast('error', 'Validation Error', 'Bidder Number is required for Sold status.');
        return;
      }
    }

    setIsClerkingSaving(true);
    try {
      // 1. Update lot in Supabase
      await lotsService.updateLot(targetLot.id, {
        status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
        hammerPrice: finalPrice,
        currentBid: isSold ? finalPrice : targetLot.startingBid,
        highBidderPaddle: finalPaddle || undefined,
        highBidderName: clerkSeller.trim() || undefined,
        consignorName: targetLot.consignorName || undefined,
        title: clerkTitle.trim() || targetLot.title
      });

      // 2. If sold, insert winning bid in public.bids
      if (isSold) {
        try {
          const matchedReg = registrations.find(r => r.bidCardNumber.toLowerCase() === finalPaddle?.toLowerCase());
          await (supabaseAdmin || supabase).from('bids').insert([{
            id: \`bid-\${Date.now()}\`,
            lot_id: targetLot.id,
            auction_id: auction.id,
            lot_number: targetLot.lotNumber,
            amount: finalPrice,
            paddle_number: finalPaddle,
            bidder_name: clerkSeller.trim() || matchedReg?.bidderName || \`Bidder #\${finalPaddle}\`,
            source: 'Floor Clerking',
            is_winning: true,
            created_at: new Date().toISOString()
          }]);
        } catch (bidErr) {
          console.warn('[AuctionDayTab] Insert clerking bid error:', bidErr);
        }

        // Dynamically create/sync Bidder & Seller Settlements in Supabase
        try {
          await settlementService.syncSettlementsFromSoldLots(auction.id, auction.code);
        } catch (syncErr) {
          console.warn('[AuctionDayTab] Sync settlements error:', syncErr);
        }
      }

      // 3. Update local customLots state
      setCustomLots(prev => prev.map(l => {
        if (l.id === targetLot.id) {
          return {
            ...l,
            status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
            hammerPrice: finalPrice,
            currentBid: isSold ? finalPrice : l.startingBid,
            highBidderPaddle: finalPaddle || undefined,
            highBidderName: clerkSeller.trim() || undefined,
            consignorName: l.consignorName,
            title: clerkTitle.trim() || l.title
          };
        }
        return l;
      }));

      // Call parent callback if available
      if (isSold && onHammerSold) {
        onHammerSold(targetLot.id, finalPrice, finalPaddle || '101');
      } else if (isPassed && onPassLot) {
        onPassLot(targetLot.id, 'Reserve Not Met / Clerk Passed');
      }

      playGavelSound();
      showToast('success', 'Clerking Saved', \`Lot #\${targetLot.lotNumber} marked as \${clerkStatus}\${isSold ? \` for \${formatCurrency(finalPrice)} to Paddle #\${finalPaddle}\` : ''}.\`);

      // 4. Clerking Assist: Auto-advance to next lot if ON
      if (clerkingAssist) {
        const sortedLots = [...auctionLots].sort((a, b) => a.lotNumber - b.lotNumber);
        const currentIndex = sortedLots.findIndex(l => l.lotNumber === targetLot.lotNumber);
        const nextLot = sortedLots.slice(currentIndex + 1).find(l => l.status !== 'sold' && l.status !== 'passed')
          || sortedLots[currentIndex + 1];

        if (nextLot) {
          setClerkLotNumber(String(nextLot.lotNumber));
          setClerkHammerPrice('');
          setClerkBidderNumber('');
          setClerkStatus('Sold');
        } else {
          showToast('info', 'Catalog Completed', 'All lots have been clerked for this auction.');
        }
      }
    } catch (err) {
      console.error('[AuctionDayTab] Clerking save error:', err);
      showToast('error', 'Error', 'Failed to save clerking record to Supabase.');
    } finally {
      setIsClerkingSaving(false);
    }
  };`;

const replacementClerkingSection = `  // Clerking status counts for filter tabs
  const clerkingCounts = useMemo(() => {
    let upcoming = 0;
    let sold = 0;
    let passed = 0;
    auctionLots.forEach(l => {
      if (l.status === 'sold') sold++;
      else if (l.status === 'passed') passed++;
      else upcoming++;
    });
    return { all: auctionLots.length, upcoming, sold, passed };
  }, [auctionLots]);

  // Filtered clerking lots for table
  const filteredClerkingLots = useMemo(() => {
    return auctionLots.filter(l => {
      // 1. Status Filter
      if (clerkingStatusFilter === 'sold' && l.status !== 'sold') return false;
      if (clerkingStatusFilter === 'passed' && l.status !== 'passed') return false;
      if (clerkingStatusFilter === 'upcoming' && (l.status === 'sold' || l.status === 'passed')) return false;

      // 2. Search query
      if (!clerkingSearch.trim()) return true;
      const q = clerkingSearch.toLowerCase();
      const num = String(l.lotNumber);
      const title = (l.title || '').toLowerCase();
      const buyer = ((l as any).highBidderName || '').toLowerCase();
      const paddle = ((l as any).highBidderPaddle || '').toLowerCase();
      return (
        num.includes(q) ||
        title.includes(q) ||
        buyer.includes(q) ||
        paddle.includes(q)
      );
    });
  }, [auctionLots, clerkingStatusFilter, clerkingSearch]);

  // Handle Save Clerking Entry
  const handleSaveClerking = async () => {
    const targetEventId = activeEventId || selectedAuctionId || auction?.id;
    if (!targetEventId) {
      showToast('error', 'Validation Error', 'Please select a valid event.');
      setInlineErrors({ eventName: 'Please select an auction event' });
      return;
    }

    const parsedLotNum = parseInt(clerkLotNumber, 10);
    if (isNaN(parsedLotNum) || !clerkLotNumber.trim()) {
      showToast('error', 'Validation Error', 'Please complete all required fields.');
      setInlineErrors({ lotNumber: 'Please enter a valid lot number' });
      return;
    }

    const targetLot = auctionLots.find(l => l.lotNumber === parsedLotNum);
    if (!targetLot) {
      showToast('error', 'Lot Not Found', \`Lot #\${clerkLotNumber} does not exist in the selected event.\`);
      setInlineErrors({ lotNumber: \`Lot #\${clerkLotNumber} not in this event\` });
      return;
    }

    const isSold = clerkStatus === 'Sold';
    const isPassed = clerkStatus === 'Passed';
    const finalPrice = isSold ? parseFloat(clerkHammerPrice) : 0;
    const finalPaddle = isSold ? clerkBidderNumber.trim() : null;
    const errors: typeof inlineErrors = {};

    // Duplicate sale attempt
    if (isSold && targetLot.status === 'sold') {
      showToast('warning', 'Already Sold', 'This lot has already been sold.');
      return;
    }

    if (isSold) {
      if (!clerkSeller || !clerkSeller.trim()) {
        errors.soldTo = 'Sold To buyer is required';
      }
      if (isNaN(finalPrice) || finalPrice <= 0) {
        errors.hammerPrice = 'Hammer price must be > 0';
      }
      if (!finalPaddle) {
        errors.bidderNumber = 'Bidder Number is required';
      }
      if (clerkQuantity < 1) {
        errors.quantity = 'Quantity must be at least 1';
      }

      if (Object.keys(errors).length > 0) {
        setInlineErrors(errors);
        if (errors.soldTo) {
          showToast('error', 'Validation Error', 'Please complete all required fields.');
        } else if (errors.hammerPrice) {
          showToast('error', 'Validation Error', 'Please enter a valid Hammer Price greater than $0.');
        } else if (errors.bidderNumber) {
          showToast('error', 'Validation Error', 'Bidder Number is required for Sold status.');
        } else if (errors.quantity) {
          showToast('error', 'Validation Error', 'Please enter a valid positive integer quantity.');
        }
        return;
      }
    }

    // Clear inline errors
    setInlineErrors({});
    setIsClerkingSaving(true);

    try {
      // 1. Update lot in Supabase
      const updatePayload: Partial<LotItem> = {
        status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
        hammerPrice: finalPrice,
        currentBid: isSold ? finalPrice : targetLot.startingBid,
        highBidderPaddle: finalPaddle || undefined,
        highBidderName: clerkSeller.trim() || undefined,
        quantity: clerkQuantity,
        title: targetLot.title // Preserve lot title, do not overwrite with event name
      };

      await lotsService.updateLot(targetLot.id, updatePayload);

      // 2. If sold, insert winning bid in public.bids and sync settlements
      if (isSold) {
        try {
          const matchedReg = registrations.find(r => r.bidCardNumber.toLowerCase() === finalPaddle?.toLowerCase());
          await (supabaseAdmin || supabase).from('bids').insert([{
            id: \`bid-\${Date.now()}\`,
            lot_id: targetLot.id,
            auction_id: targetEventId,
            lot_number: targetLot.lotNumber,
            amount: finalPrice,
            paddle_number: finalPaddle,
            bidder_name: clerkSeller.trim() || matchedReg?.bidderName || \`Bidder #\${finalPaddle}\`,
            source: 'Floor Clerking',
            is_winning: true,
            created_at: new Date().toISOString()
          }]);
        } catch (bidErr) {
          console.warn('[AuctionDayTab] Insert clerking bid error:', bidErr);
        }

        try {
          const auctionCode = supabaseAuctions.find(a => a.id === targetEventId)?.code || auction?.code || 'AUC-001';
          await settlementService.syncSettlementsFromSoldLots(targetEventId, auctionCode);
        } catch (syncErr) {
          console.warn('[AuctionDayTab] Sync settlements error:', syncErr);
        }
      }

      // 3. Update local customLots state
      setCustomLots(prev => prev.map(l => {
        if (l.id === targetLot.id) {
          return {
            ...l,
            status: isSold ? 'sold' : isPassed ? 'passed' : 'upcoming',
            hammerPrice: finalPrice,
            currentBid: isSold ? finalPrice : l.startingBid,
            highBidderPaddle: finalPaddle || undefined,
            highBidderName: clerkSeller.trim() || undefined,
            quantity: clerkQuantity
          };
        }
        return l;
      }));

      // Call parent callback if available
      if (isSold && onHammerSold) {
        onHammerSold(targetLot.id, finalPrice, finalPaddle || '101');
      } else if (isPassed && onPassLot) {
        onPassLot(targetLot.id, 'Reserve Not Met / Clerk Passed');
      }

      playGavelSound();

      // Toast notification according to prompt requirements
      if (isSold) {
        showToast('success', 'Sale Completed', 'Lot sold successfully.');
      } else {
        showToast('success', 'Clerking Saved', 'Clerking record saved successfully.');
      }

      // 4. Clerking Assist: Auto-advance to next lot
      if (clerkingAssist) {
        const sortedLots = [...auctionLots].sort((a, b) => a.lotNumber - b.lotNumber);
        const currentIndex = sortedLots.findIndex(l => l.lotNumber === targetLot.lotNumber);
        const nextLot = sortedLots.slice(currentIndex + 1).find(l => l.status !== 'sold' && l.status !== 'passed')
          || sortedLots[currentIndex + 1];

        if (nextLot) {
          setClerkLotNumber(String(nextLot.lotNumber));
          setActiveClerkLotId(nextLot.id);
          setClerkHammerPrice('');
          setClerkBidderNumber('');
          setClerkStatus('Sold');
        } else {
          showToast('info', 'Catalog Completed', 'All lots have been clerked for this auction.');
        }
      }
    } catch (err) {
      console.error('[AuctionDayTab] Clerking save error:', err);
      showToast('error', 'Error', 'Failed to save clerking record. Please try again.');
    } finally {
      setIsClerkingSaving(false);
    }
  };`;

// 6. Header description for Live Clerking Desk
const targetHeaderDesc = `              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Active Lot #{selectedClerkLot?.lotNumber || clerkLotNumber} — {selectedClerkLot?.title || 'Saleroom Lot'}
              </p>`;

const replacementHeaderDesc = `              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {selectedClerkLot
                  ? \`Active Lot #\${selectedClerkLot.lotNumber} — \${selectedClerkLot.title}\`
                  : auctionLots.length > 0
                  ? \`Active Lot #\${clerkLotNumber || auctionLots[0].lotNumber} — \${auctionLots[0].title}\`
                  : 'No lots found for this auction event'}
              </p>`;

// 7. Clerking Entry Form inputs (fields 1 to 7)
const targetClerkingEntryForm = `            {/* Entry Fields - One Single Horizontal Line */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(75px, 0.7fr) minmax(170px, 1.5fr) minmax(210px, 2fr) minmax(130px, 1.1fr) minmax(120px, 1fr) minmax(65px, 0.6fr) minmax(120px, 1fr)',
              gap: 12,
              alignItems: 'start'
            }}>
              {/* Lot Number */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Lot Number *
                </label>
                <input
                  type="number"
                  disabled={isAuctionClosed}
                  value={clerkLotNumber}
                  onChange={(e) => setClerkLotNumber(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                  placeholder="e.g. 1"
                />
              </div>

              {/* Sold To (formerly Seller) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Sold To *
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkSeller}
                  onChange={(val) => {
                    setClerkSeller(val);
                    const matched = supabaseCustomers.find(c => c.fullName === val);
                    if (matched?.permanentBidderNumber) {
                      setClerkBidderNumber(matched.permanentBidderNumber);
                    }
                  }}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search customer..."
                  placeholder="Select customer..."
                  clearable={true}
                  options={customerSelectOptions}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Event Name
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkTitle}
                  onChange={(val) => setClerkTitle(val)}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search title..."
                  placeholder="Select auction title..."
                  clearable={true}
                  options={auctionTitleSelectOptions}
                />
              </div>

              {/* Hammer Price with X Money */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Hammer Price ($)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={clerkXMoney}
                      onChange={(e) => setClerkXMoney(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>x money</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="10"
                  disabled={isAuctionClosed}
                  value={clerkHammerPrice}
                  onChange={(e) => setClerkHammerPrice(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: '#15803d' }}
                  placeholder="0.00"
                />
              </div>

              {/* Bidder Number with validation helper */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Bidder Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBidderCheckInModalOpen(true);
                      setCheckInTabMode('find');
                      handleExecuteCheckInSearch();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-dark, #9a741e)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                    title="Lookup & select existing customer to fill Bidder #"
                  >
                    Lookup
                  </button>
                </div>
                <input
                  type="text"
                  disabled={isAuctionClosed}
                  value={clerkBidderNumber}
                  onChange={(e) => setClerkBidderNumber(e.target.value)}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                  placeholder="e.g. 104"
                />
                <div style={{ marginTop: 4, minHeight: 18 }}>
                  {bidderValidationStatus ? (
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: bidderValidationStatus.bg,
                      color: bidderValidationStatus.color,
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }}>
                      {bidderValidationStatus.text}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Enter paddle number</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isAuctionClosed}
                  value={clerkQuantity}
                  onChange={(e) => setClerkQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="catalog-search-input"
                  style={{ width: '100%', height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Status
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkStatus}
                  onChange={(val) => setClerkStatus(val)}
                  size="md"
                  fullWidth
                  options={[
                    { value: 'Sold', label: 'Sold' },
                    { value: 'Passed', label: 'Passed' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Withdrawn', label: 'Withdrawn' }
                  ]}
                />
              </div>
            </div>`;

const replacementClerkingEntryForm = `            {/* Entry Fields - One Single Horizontal Line */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(75px, 0.7fr) minmax(170px, 1.5fr) minmax(210px, 2fr) minmax(130px, 1.1fr) minmax(120px, 1fr) minmax(65px, 0.6fr) minmax(120px, 1fr)',
              gap: 12,
              alignItems: 'start'
            }}>
              {/* Lot Number */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Lot Number *
                </label>
                <input
                  type="number"
                  disabled={isAuctionClosed}
                  value={clerkLotNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClerkLotNumber(val);
                    if (inlineErrors.lotNumber) {
                      setInlineErrors(prev => ({ ...prev, lotNumber: undefined }));
                    }
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      const matched = auctionLots.find(l => l.lotNumber === num);
                      if (matched) {
                        setActiveClerkLotId(matched.id);
                      }
                    }
                  }}
                  className="catalog-search-input"
                  style={{
                    width: '100%',
                    height: 38,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 14,
                    borderColor: inlineErrors.lotNumber ? '#dc2626' : undefined
                  }}
                  placeholder="e.g. 1"
                />
                {inlineErrors.lotNumber && (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.lotNumber}
                  </span>
                )}
              </div>

              {/* Sold To */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Sold To *
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkSeller}
                  onChange={(val) => {
                    setClerkSeller(val);
                    if (inlineErrors.soldTo) {
                      setInlineErrors(prev => ({ ...prev, soldTo: undefined }));
                    }
                    const matched = supabaseCustomers.find(c => c.fullName === val);
                    if (matched) {
                      const paddle = matched.permanentBidderNumber || matched.customerCode.replace('CUST-', '');
                      if (paddle) {
                        setClerkBidderNumber(paddle);
                        if (inlineErrors.bidderNumber) {
                          setInlineErrors(prev => ({ ...prev, bidderNumber: undefined }));
                        }
                      }
                    }
                  }}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search customer..."
                  placeholder="Select customer..."
                  clearable={true}
                  options={customerSelectOptions}
                />
                {inlineErrors.soldTo && (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.soldTo}
                  </span>
                )}
              </div>

              {/* Event Name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Event Name *
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={currentClerkEventId}
                  onChange={(val) => handleSelectEvent(val)}
                  size="md"
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search event..."
                  placeholder="Select auction event..."
                  clearable={false}
                  options={auctionEventSelectOptions}
                />
                {inlineErrors.eventName && (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.eventName}
                  </span>
                )}
              </div>

              {/* Hammer Price with X Money */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Hammer Price ($)
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={clerkXMoney}
                      onChange={(e) => setClerkXMoney(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>x money</span>
                  </label>
                </div>
                <input
                  type="number"
                  step="10"
                  disabled={isAuctionClosed}
                  value={clerkHammerPrice}
                  onChange={(e) => {
                    setClerkHammerPrice(e.target.value);
                    if (inlineErrors.hammerPrice) {
                      setInlineErrors(prev => ({ ...prev, hammerPrice: undefined }));
                    }
                  }}
                  className="catalog-search-input"
                  style={{
                    width: '100%',
                    height: 38,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#15803d',
                    borderColor: inlineErrors.hammerPrice ? '#dc2626' : undefined
                  }}
                  placeholder="0.00"
                />
                {inlineErrors.hammerPrice && (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.hammerPrice}
                  </span>
                )}
              </div>

              {/* Bidder Number with validation helper */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 20, marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', margin: 0 }}>
                    Bidder Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBidderCheckInModalOpen(true);
                      setCheckInTabMode('find');
                      handleExecuteCheckInSearch();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-dark, #9a741e)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                    title="Lookup & select existing customer to fill Bidder #"
                  >
                    Lookup
                  </button>
                </div>
                <input
                  type="text"
                  disabled={isAuctionClosed}
                  value={clerkBidderNumber}
                  onChange={(e) => {
                    setClerkBidderNumber(e.target.value);
                    if (inlineErrors.bidderNumber) {
                      setInlineErrors(prev => ({ ...prev, bidderNumber: undefined }));
                    }
                  }}
                  className="catalog-search-input"
                  style={{
                    width: '100%',
                    height: 38,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 14,
                    borderColor: inlineErrors.bidderNumber ? '#dc2626' : undefined
                  }}
                  placeholder="e.g. 104"
                />
                {inlineErrors.bidderNumber ? (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.bidderNumber}
                  </span>
                ) : (
                  <div style={{ marginTop: 4, minHeight: 18 }}>
                    {bidderValidationStatus ? (
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: bidderValidationStatus.bg,
                        color: bidderValidationStatus.color,
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {bidderValidationStatus.text}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>Enter paddle number</span>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={isAuctionClosed}
                  value={clerkQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setClerkQuantity(isNaN(val) ? 1 : val);
                    if (inlineErrors.quantity) {
                      setInlineErrors(prev => ({ ...prev, quantity: undefined }));
                    }
                  }}
                  className="catalog-search-input"
                  style={{
                    width: '100%',
                    height: 38,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 14,
                    borderColor: inlineErrors.quantity ? '#dc2626' : undefined
                  }}
                />
                {inlineErrors.quantity && (
                  <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>
                    {inlineErrors.quantity}
                  </span>
                )}
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', height: 20, lineHeight: '20px', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Status
                </label>
                <ShadcnSelect
                  disabled={isAuctionClosed}
                  value={clerkStatus}
                  onChange={(val) => {
                    setClerkStatus(val);
                    if (val !== 'Sold') {
                      setInlineErrors({});
                    }
                  }}
                  size="md"
                  fullWidth
                  options={[
                    { value: 'Sold', label: 'Sold' },
                    { value: 'Passed', label: 'Passed' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Withdrawn', label: 'Withdrawn' }
                  ]}
                />
              </div>
            </div>`;

// 8. Table toolbar & table columns
const targetTableSection = `          {/* Clerking Records Table Section */}
          <div className="card-luxury" style={{ padding: 20, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              {/* Batch Action Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShadcnDropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>{selectedClerkingLotIds.size > 0 ? \`\${selectedClerkingLotIds.size} Selected\` : 'No Clerkings Selected'}</span>
                      <ChevronDown size={14} />
                    </button>
                  }
                  items={[
                    {
                      label: 'Mark Selected as Sold',
                      onClick: () => handleBatchClerkingAction('sold'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Mark Selected as Passed',
                      onClick: () => handleBatchClerkingAction('passed'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Reopen Selected Lots',
                      onClick: () => handleBatchClerkingAction('reopen'),
                      disabled: selectedClerkingLotIds.size === 0
                    }
                  ]}
                />
              </div>

              {/* Search with gear configuration icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="catalog-search-wrapper" style={{ width: 240 }}>
                  <Search size={14} className="catalog-search-icon" />
                  <input
                    type="text"
                    placeholder="Search clerked lots..."
                    value={clerkingSearch}
                    onChange={(e) => {
                      setClerkingSearch(e.target.value);
                      setClerkingPage(1);
                    }}
                    className="catalog-search-input"
                    style={{ height: 34, fontSize: 12.5 }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Table column settings"
                  style={{ height: 34, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Settings size={15} color="#64748b" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredClerkingLots.length > 0 && selectedClerkingLotIds.size === filteredClerkingLots.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClerkingLotIds(new Set(filteredClerkingLots.map(l => l.id)));
                          } else {
                            setSelectedClerkingLotIds(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                        aria-label="Select all clerkings"
                      />
                    </th>
                    <th style={{ width: 95 }}>LOT NUMBER</th>
                    <th style={{ width: 140 }}>Sold To </th>
                    <th style={{ minWidth: 200 }}>Event Name

                    </th>
                    <th style={{ width: 130, textAlign: 'right' }}>HAMMER PRICE</th>
                    <th style={{ width: 85, textAlign: 'center' }}>X MONEY</th>
                    <th style={{ width: 110, textAlign: 'center' }}>BIDDER NUMBER</th>
                    <th style={{ width: 85, textAlign: 'center' }}>QUANTITY</th>
                    <th style={{ width: 100, textAlign: 'center' }}>STATUS</th>
                    <th style={{ width: 110, textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const clerkStartIndex = (clerkingPage - 1) * clerkingPageSize;
                    const pageSlice = filteredClerkingLots.slice(clerkStartIndex, clerkStartIndex + clerkingPageSize);

                    if (pageSlice.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                            No items to display.
                          </td>
                        </tr>
                      );
                    }

                    return pageSlice.map(lot => {
                      const isSelected = selectedClerkingLotIds.has(lot.id);
                      const isSold = lot.status === 'sold';
                      const isPassed = lot.status === 'passed';
                      const sellerName = lot.consignorName || (lot as any).sellerName || (lot as any).consignor_name || '—';
                      const hammerVal = isSold ? (lot.hammerPrice || lot.currentBid || 0) : null;
                      const paddleNum = lot.highBidderPaddle || (lot as any).soldToBidderId || (isSold ? '101' : null);

                      return (
                        <tr
                          key={lot.id}
                          style={{
                            background: isSelected ? 'rgba(203, 161, 53, 0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedClerkingLotIds);
                                if (next.has(lot.id)) next.delete(lot.id);
                                else next.add(lot.id);
                                setSelectedClerkingLotIds(next);
                              }}
                              style={{ cursor: 'pointer' }}
                              aria-label={\`Select Lot #\${lot.lotNumber}\`}
                            />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                            #{lot.lotNumber}
                          </td>
                          <td style={{ color: '#475569', fontWeight: 500 }}>
                            {sellerName}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {lot.title}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSold ? '#15803d' : '#94a3b8' }}>
                            {hammerVal !== null ? formatCurrency(hammerVal) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                            {clerkXMoney ? 'Yes' : 'No'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {paddleNum ? \`#\${paddleNum}\` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            1
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSold ? '#dcfce7' : isPassed ? '#fee2e2' : lot.status === 'on_block' ? '#fef3c7' : '#f1f5f9',
                              color: isSold ? '#15803d' : isPassed ? '#b91c1c' : lot.status === 'on_block' ? '#92400e' : '#64748b'
                            }}>
                              {isSold ? 'Sold' : isPassed ? 'Passed' : lot.status === 'on_block' ? 'On Block' : 'Upcoming'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <TableRowActionMenu
                              actions={[
                                {
                                  label: 'View Details',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('view', lot)
                                },
                                {
                                  label: 'Edit Clerking',
                                  icon: <Edit size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('edit', lot)
                                },
                                ...(isSold || isPassed ? [
                                  {
                                    label: 'Reopen Lot',
                                    icon: <RotateCcw size={14} />,
                                    onClick: () => handleReopenClerkedLot(lot.id)
                                  }
                                ] : []),
                                ...(!isPassed && !isSold ? [
                                  {
                                    label: 'Mark as Passed',
                                    icon: <AlertCircle size={14} />,
                                    onClick: () => {
                                      if (onPassLot) onPassLot(lot.id, 'Reserve Not Met');
                                      setCustomLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'passed', hammerPrice: 0 } : l));
                                      showToast('info', 'Passed', \`Lot #\${lot.lotNumber} marked as Passed.\`);
                                    }
                                  }
                                ] : [])
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>`;

const replacementTableSection = `          {/* Clerking Records Table Section */}
          <div className="card-luxury" style={{ padding: 20, background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              {/* Batch Action Dropdown & Status Filter Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <ShadcnDropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>{selectedClerkingLotIds.size > 0 ? \`\${selectedClerkingLotIds.size} Selected\` : 'No Clerkings Selected'}</span>
                      <ChevronDown size={14} />
                    </button>
                  }
                  items={[
                    {
                      label: 'Mark Selected as Sold',
                      onClick: () => handleBatchClerkingAction('sold'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Mark Selected as Passed',
                      onClick: () => handleBatchClerkingAction('passed'),
                      disabled: selectedClerkingLotIds.size === 0
                    },
                    {
                      label: 'Reopen Selected Lots',
                      onClick: () => handleBatchClerkingAction('reopen'),
                      disabled: selectedClerkingLotIds.size === 0
                    }
                  ]}
                />

                {/* Status Tabs */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginRight: 2 }}>
                    Status:
                  </span>
                  {(['all', 'upcoming', 'sold', 'passed'] as const).map(tab => {
                    const isActive = clerkingStatusFilter === tab;
                    const count = clerkingCounts[tab];
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setClerkingStatusFilter(tab);
                          setClerkingPage(1);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          border: isActive ? '1px solid var(--gold-primary, #cba135)' : '1px solid #e2e8f0',
                          background: isActive ? '#fffbeb' : '#ffffff',
                          color: isActive ? 'var(--gold-dark, #9a741e)' : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>{tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                        <span style={{
                          fontSize: 10.5,
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: isActive ? 'var(--gold-primary, #cba135)' : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#64748b',
                          fontWeight: 700
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search with gear configuration icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="catalog-search-wrapper" style={{ width: 240 }}>
                  <Search size={14} className="catalog-search-icon" />
                  <input
                    type="text"
                    placeholder="Search clerked lots..."
                    value={clerkingSearch}
                    onChange={(e) => {
                      setClerkingSearch(e.target.value);
                      setClerkingPage(1);
                    }}
                    className="catalog-search-input"
                    style={{ height: 34, fontSize: 12.5 }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Table column settings"
                  style={{ height: 34, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Settings size={15} color="#64748b" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="catalog-table-scroll" style={{ border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
              <table className="catalog-luxury-table" style={{ fontSize: 13, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredClerkingLots.length > 0 && selectedClerkingLotIds.size === filteredClerkingLots.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClerkingLotIds(new Set(filteredClerkingLots.map(l => l.id)));
                          } else {
                            setSelectedClerkingLotIds(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                        aria-label="Select all clerkings"
                      />
                    </th>
                    <th style={{ width: 85 }}>LOT NUMBER</th>
                    <th style={{ minWidth: 150 }}>LOT NAME</th>
                    <th style={{ minWidth: 150 }}>EVENT NAME</th>
                    <th style={{ minWidth: 140 }}>SOLD TO</th>
                    <th style={{ width: 120, textAlign: 'right' }}>HAMMER PRICE</th>
                    <th style={{ width: 80, textAlign: 'center' }}>X MONEY</th>
                    <th style={{ width: 110, textAlign: 'center' }}>BIDDER NUMBER</th>
                    <th style={{ width: 75, textAlign: 'center' }}>QUANTITY</th>
                    <th style={{ width: 95, textAlign: 'center' }}>STATUS</th>
                    <th style={{ width: 80, textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (isLotsLoading) {
                      return (
                        <tr>
                          <td colSpan={11} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Loading lots for selected event...</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const clerkStartIndex = (clerkingPage - 1) * clerkingPageSize;
                    const pageSlice = filteredClerkingLots.slice(clerkStartIndex, clerkStartIndex + clerkingPageSize);

                    if (pageSlice.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                            {auctionLots.length === 0
                              ? 'No lots found for this auction event. Please add lots to this event in the Pre-Auction Catalog.'
                              : \`No \${clerkingStatusFilter === 'all' ? '' : clerkingStatusFilter + ' '}items match your criteria.\`}
                          </td>
                        </tr>
                      );
                    }

                    return pageSlice.map(lot => {
                      const isSelected = selectedClerkingLotIds.has(lot.id);
                      const isSold = lot.status === 'sold';
                      const isPassed = lot.status === 'passed';
                      const lotEvent = supabaseAuctions.find(a => a.id === (lot.auctionId || currentClerkEventId));
                      const lotEventName = lotEvent?.title || auction?.name || 'Live Auction';
                      const buyerName = isSold ? (lot.highBidderName || (lot as any).soldTo || '—') : '—';
                      const hammerVal = isSold ? (lot.hammerPrice || lot.currentBid || 0) : null;
                      const paddleNum = isSold ? (lot.highBidderPaddle || (lot as any).soldToBidderId || null) : null;

                      return (
                        <tr
                          key={lot.id}
                          style={{
                            background: isSelected ? 'rgba(203, 161, 53, 0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedClerkingLotIds);
                                if (next.has(lot.id)) next.delete(lot.id);
                                else next.add(lot.id);
                                setSelectedClerkingLotIds(next);
                              }}
                              style={{ cursor: 'pointer' }}
                              aria-label={\`Select Lot #\${lot.lotNumber}\`}
                            />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-dark, #9a741e)' }}>
                            #{lot.lotNumber}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {lot.title}
                            </div>
                          </td>
                          <td style={{ color: '#475569', fontWeight: 500 }}>
                            {lotEventName}
                          </td>
                          <td style={{ color: isSold ? 'var(--text-main)' : '#94a3b8', fontWeight: isSold ? 600 : 400 }}>
                            {buyerName}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSold ? '#15803d' : '#94a3b8' }}>
                            {hammerVal !== null ? formatCurrency(hammerVal) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                            {lot.isXMoney || (lot as any).x_money ? 'Yes' : 'No'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {paddleNum ? \`#\${paddleNum}\` : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                            {lot.quantity || 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isSold ? '#dcfce7' : isPassed ? '#fee2e2' : lot.status === 'on_block' ? '#fef3c7' : '#f1f5f9',
                              color: isSold ? '#15803d' : isPassed ? '#b91c1c' : lot.status === 'on_block' ? '#92400e' : '#64748b'
                            }}>
                              {isSold ? 'Sold' : isPassed ? 'Passed' : lot.status === 'on_block' ? 'On Block' : 'Upcoming'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <TableRowActionMenu
                              actions={[
                                {
                                  label: 'View Details',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('view', lot)
                                },
                                {
                                  label: 'Edit Clerking',
                                  icon: <Edit size={14} />,
                                  onClick: () => handleOpenClerkingDrawer('edit', lot)
                                },
                                ...(isSold || isPassed ? [
                                  {
                                    label: 'Reopen Lot',
                                    icon: <RotateCcw size={14} />,
                                    onClick: () => handleReopenClerkedLot(lot.id)
                                  }
                                ] : []),
                                ...(!isPassed && !isSold ? [
                                  {
                                    label: 'Mark as Passed',
                                    icon: <AlertCircle size={14} />,
                                    onClick: () => {
                                      if (onPassLot) onPassLot(lot.id, 'Reserve Not Met');
                                      setCustomLots(prev => prev.map(l => l.id === lot.id ? { ...l, status: 'passed', hammerPrice: 0 } : l));
                                      showToast('info', 'Passed', \`Lot #\${lot.lotNumber} marked as Passed.\`);
                                    }
                                  }
                                ] : [])
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>`;

// Normalize line endings for replacement
function replaceChunk(src, target, repl, label) {
  const normSrc = src.replace(/\\r\\n/g, '\\n');
  const normTarget = target.replace(/\\r\\n/g, '\\n');
  const normRepl = repl.replace(/\\r\\n/g, '\\n');

  if (!normSrc.includes(normTarget)) {
    console.error('Target not found for:', label);
    return src;
  }
  console.log('Successfully replaced:', label);
  return normSrc.replace(normTarget, normRepl);
}

let updated = code;
updated = replaceChunk(updated, targetState, replacementState, 'State Declarations');
updated = replaceChunk(updated, targetAuctionLots, replacementAuctionLots, 'AuctionLots & Event Sync');
updated = replaceChunk(updated, targetAuctionTitleSelectOptions, replacementAuctionEventSelectOptions, 'AuctionEventSelectOptions');
updated = replaceChunk(updated, targetSelectedClerkLotEffect, replacementSelectedClerkLotEffect, 'SelectedClerkLot & Effect');
updated = replaceChunk(updated, targetClerkingSection, replacementClerkingSection, 'FilteredClerkingLots & HandleSaveClerking');
updated = replaceChunk(updated, targetHeaderDesc, replacementHeaderDesc, 'Header Description');
updated = replaceChunk(updated, targetClerkingEntryForm, replacementClerkingEntryForm, 'Clerking Entry Form Fields');
updated = replaceChunk(updated, targetTableSection, replacementTableSection, 'Table Toolbar & Body');

fs.writeFileSync(filePath, updated, 'utf8');
console.log('AuctionDayTab.tsx updated successfully!');
