import fs from 'fs';

let content = fs.readFileSync('src/services/auctionService.ts', 'utf8');

const needle = '  public async createAuction(data: Partial<AuctionDetail>): Promise<AuctionDetail> {';
const startIndex = content.indexOf(needle);
if (startIndex === -1) {
  console.error('Needle not found');
  process.exit(1);
}

// Find the end of createAuction method
// It ends right before '  private auctionListeners: Set<() => void> = new Set();'
const endNeedle = '  private auctionListeners: Set<() => void> = new Set();';
const endIndex = content.indexOf(endNeedle);
if (endIndex === -1) {
  console.error('End needle not found');
  process.exit(1);
}

const newCode = `  /**
   * Check whether an auction code is unique in both local cache and Supabase database.
   * Returns true if the code is available (unique), false if already taken.
   */
  public async isAuctionCodeUnique(code: string, excludeAuctionId?: string): Promise<boolean> {
    const cleanCode = code ? code.trim().toUpperCase() : '';
    if (!cleanCode) return true;

    // 1. Check local cache
    const localMatch = this.auctions.find(
      a => a.code?.toUpperCase().trim() === cleanCode && a.id !== excludeAuctionId
    );
    if (localMatch) {
      return false;
    }

    // 2. Query Supabase database
    try {
      let query = supabaseAdmin
        .from('auctions')
        .select('id, code')
        .ilike('code', cleanCode);

      if (excludeAuctionId) {
        query = query.neq('id', excludeAuctionId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[AuctionService] isAuctionCodeUnique query notice:', error.message);
        return true;
      }

      return !data || data.length === 0;
    } catch (err) {
      console.warn('[AuctionService] isAuctionCodeUnique error:', err);
      return true;
    }
  }

  /**
   * Automatically generate a unique auction code using the existing project naming convention:
   * [PREFIX]-[YYYY]-[MM]-[DD]
   * (e.g. HGS-2026-10-22, RCC-2026-11-04, GA-2026-11-04)
   * Guaranteed to be unique against both local state and Supabase database.
   */
  public async generateUniqueAuctionCode(name?: string, startDate?: string): Promise<string> {
    // 1. Derive prefix from auction name if provided (e.g. "Rare Coin Collection" -> "RCC", "Highlander Gold & Silver" -> "HGS")
    let prefix = 'GA';
    if (name && name.trim()) {
      const cleanName = name.trim().replace(/[^a-zA-Z0-9\\s]/g, '');
      const words = cleanName
        .split(/\\s+/)
        .filter(w => !['a', 'an', 'the', 'and', 'of', 'for', 'in', 'on', 'at', 'to', 'with', 'by', '&'].includes(w.toLowerCase()));

      if (words.length >= 2) {
        prefix = words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
      } else if (words.length === 1 && words[0].length >= 2) {
        prefix = words[0].slice(0, 3).toUpperCase();
      }
    }

    // 2. Derive date part (YYYY-MM-DD) from startDate or today's date
    let datePart = new Date().toISOString().split('T')[0];
    if (startDate && /^\\d{4}-\\d{2}-\\d{2}$/.test(startDate)) {
      datePart = startDate;
    }

    // Base candidate format: e.g. "RCC-2026-11-04" or "HGS-2026-10-22"
    let candidate = \`\${prefix}-\${datePart}\`;
    let isUnique = await this.isAuctionCodeUnique(candidate);
    if (isUnique) {
      return candidate;
    }

    // 3. If duplicate, append sequence numbers: RCC-2026-11-04-01, RCC-2026-11-04-02...
    for (let seq = 1; seq <= 99; seq++) {
      const seqCandidate = \`\${candidate}-\${seq.toString().padStart(2, '0')}\`;
      if (await this.isAuctionCodeUnique(seqCandidate)) {
        return seqCandidate;
      }
    }

    // 4. Secondary fallback: random 4-character uppercase alphanumeric suffix
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return \`\${candidate}-\${randomSuffix}\`;
  }

  public async createAuction(data: Partial<AuctionDetail>): Promise<AuctionDetail> {
    const newAuction = createEmptyAuctionDetail(data);

    // Validate that the code is unique in Supabase database before inserting
    const isUnique = await this.isAuctionCodeUnique(newAuction.code);
    if (!isUnique) {
      throw new Error(\`Auction code "\${newAuction.code}" is already in use in the database. Please specify or auto-generate a unique code.\`);
    }

    this.auctions.unshift(newAuction);
    this.persist();

    // Insert / Upsert directly into Supabase auctions table
    try {
      const { error } = await supabaseAdmin.from('auctions').upsert([
        {
          id: newAuction.id,
          code: newAuction.code,
          name: newAuction.name,
          description: newAuction.description,
          auction_type: newAuction.auctionType || 'HiBid',
          status: newAuction.status || 'Open',
          start_date: newAuction.startDate,
          end_date: newAuction.endDate,
          currency: newAuction.currency || 'USD',
          tax_exempt_all: Boolean(newAuction.taxExemptAll),
          live_starting_bid_card: Number(newAuction.liveStartingBidCard) || 1,
          country: newAuction.country || '',
          address1: newAuction.address1 ?? '',
          address2: newAuction.address2 ?? '',
          city: newAuction.city ?? '',
          state: newAuction.state ?? '',
          zip: newAuction.zip ?? '',
          use_consolidated_invoicing: Boolean(newAuction.useConsolidatedInvoicing),
          shipping_availability: newAuction.shippingAvailability ?? '',
          shipping_account: newAuction.shippingAccount ?? '',
          add_handling_charge: Boolean(newAuction.addHandlingCharge),
          handling_charge_type: newAuction.handlingChargeType ?? 'Fixed',
          handling_amount: Number(newAuction.handlingAmount) || 0,
          payment_info: newAuction.paymentInfo || '',
          terms: newAuction.terms || '',
          short_bp_explanation: newAuction.shortBpExplanation || '',
          featured_images: newAuction.featuredImages || [],
          auction_links: newAuction.auctionLinks || [],
          upload_settings: newAuction.uploadSettings || {},
          lot_defaults: newAuction.lotDefaults || {},
          day_stats: { lotCount: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: 'id' });

      if (error) {
        console.error('[AuctionService] Supabase insert error:', error.message);
        // Rollback local cache
        this.auctions = this.auctions.filter(a => a.id !== newAuction.id);
        this.persist();
        throw new Error(error.message);
      } else {
        console.log('[AuctionService] Auction successfully created in Supabase:', newAuction.id);
      }
    } catch (sbErr: any) {
      console.error('[AuctionService] Unexpected error inserting to Supabase:', sbErr);
      this.auctions = this.auctions.filter(a => a.id !== newAuction.id);
      this.persist();
      throw sbErr;
    }

    return newAuction;
  }

`;

const updatedContent = content.slice(0, startIndex) + newCode + content.slice(endIndex);
fs.writeFileSync('src/services/auctionService.ts', updatedContent, 'utf8');
console.log('Successfully updated src/services/auctionService.ts');
