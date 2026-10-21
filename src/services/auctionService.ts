import { AuctionDetail, SettlementCustomer, SettlementCharge, AuctionExpense } from '../types/auctionDetail';
import { MOCK_AUCTIONS_DETAIL } from '../data/mockAuctionDetailData';

const STORAGE_KEY = 'gardner_auctions_detail_v1';

class AuctionService {
  private auctions: AuctionDetail[] = [];

  constructor() {
    this.initData();
  }

  private initData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.auctions = JSON.parse(stored);
      } else {
        this.auctions = MOCK_AUCTIONS_DETAIL;
        this.persist();
      }
    } catch (e) {
      console.warn('[AuctionService] Failed to load from localStorage, using mock data:', e);
      this.auctions = MOCK_AUCTIONS_DETAIL;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.auctions));
    } catch (e) {
      console.error('[AuctionService] Failed to persist auctions to localStorage:', e);
    }
  }

  public async getAuctions(): Promise<AuctionDetail[]> {
    return [...this.auctions];
  }

  public async getAuctionById(id: string): Promise<AuctionDetail | null> {
    const found = this.auctions.find(a => a.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async saveAuction(updated: AuctionDetail): Promise<{ success: boolean; data?: AuctionDetail; error?: string }> {
    const index = this.auctions.findIndex(a => a.id === updated.id);
    if (index >= 0) {
      this.auctions[index] = { ...updated };
      this.persist();
      return { success: true, data: this.auctions[index] };
    } else {
      this.auctions.unshift(updated);
      this.persist();
      return { success: true, data: updated };
    }
  }

  public async createAuction(data: Partial<AuctionDetail>): Promise<AuctionDetail> {
    const base = this.auctions[0] || MOCK_AUCTIONS_DETAIL[0];
    const newAuction: AuctionDetail = {
      ...JSON.parse(JSON.stringify(base)),
      id: `auc-${Date.now()}`,
      code: (data.code || `AUC-${Date.now().toString().slice(-4)}`).toUpperCase(),
      name: data.name || 'New Catalog Auction',
      status: 'Open',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      description: data.description || 'Fine curated catalog items from private collections.',
      settlements: [],
      ...data
    };

    this.auctions.unshift(newAuction);
    this.persist();
    return newAuction;
  }

  public async duplicateAuction(id: string): Promise<AuctionDetail | null> {
    const original = await this.getAuctionById(id);
    if (!original) return null;

    const copy: AuctionDetail = {
      ...JSON.parse(JSON.stringify(original)),
      id: `auc-${Date.now()}`,
      code: `${original.code}-COPY`,
      name: `${original.name} (Copy)`,
      status: 'Open'
    };

    this.auctions.unshift(copy);
    this.persist();
    return copy;
  }

  public async deleteAuction(id: string): Promise<boolean> {
    const prevLen = this.auctions.length;
    this.auctions = this.auctions.filter(a => a.id !== id);
    if (this.auctions.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Settlements
  public async getSettlements(auctionId: string): Promise<SettlementCustomer[]> {
    const auction = await this.getAuctionById(auctionId);
    return auction?.settlements || [];
  }

  public async getSettlementCustomer(auctionId: string, customerId: string): Promise<SettlementCustomer | null> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return null;
    const found = auction.settlements.find(c => c.id === customerId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async saveSettlementCustomer(auctionId: string, customer: SettlementCustomer): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    const idx = auction.settlements.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      auction.settlements[idx] = customer;
    } else {
      auction.settlements.push(customer);
    }
    await this.saveAuction(auction);
    return true;
  }

  public async addCustomerCharge(
    auctionId: string,
    customerId: string,
    chargeData: Omit<SettlementCharge, 'id' | 'date'>
  ): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const customer = auction.settlements.find(c => c.id === customerId);
    if (!customer) return false;

    const newCharge: SettlementCharge = {
      ...chargeData,
      id: `chg-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    customer.charges.push(newCharge);
    customer.balance = (customer.balance || 0) + chargeData.amount;

    await this.saveAuction(auction);
    return true;
  }

  public async markAllShipped(auctionId: string, customerId: string): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const customer = auction.settlements.find(c => c.id === customerId);
    if (!customer) return false;

    customer.lots.forEach(lot => {
      lot.isShipped = true;
    });
    customer.shippedCount = customer.lots.length;

    await this.saveAuction(auction);
    return true;
  }

  public async batchProcessCreditCards(auctionId: string, customerIds: string[]): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    auction.settlements.forEach(c => {
      if (customerIds.includes(c.id)) {
        c.invoiceStatus = 'Paid';
        c.balance = 0;
      }
    });

    await this.saveAuction(auction);
    return true;
  }

  public async checkInBidder(auctionId: string, regId: string, isCheckedIn: boolean): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;

    const reg = auction.dayStats.registrations.find(r => r.id === regId);
    if (reg) {
      reg.isCheckedIn = isCheckedIn;
      if (isCheckedIn) {
        auction.dayStats.checkInCount += 1;
      } else {
        auction.dayStats.checkInCount = Math.max(0, auction.dayStats.checkInCount - 1);
      }
      await this.saveAuction(auction);
      return true;
    }
    return false;
  }

  public async getAuctionExpenses(auctionId: string): Promise<AuctionExpense[]> {
    const auction = await this.getAuctionById(auctionId);
    return auction?.expenses || [];
  }

  public async getTotalExpensesForAuction(auctionId: string): Promise<number> {
    const expenses = await this.getAuctionExpenses(auctionId);
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }

  public async addExpense(auctionId: string, expense: Omit<AuctionExpense, 'id'>): Promise<AuctionExpense | null> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return null;
    const newExpense: AuctionExpense = {
      ...expense,
      id: `exp-${Date.now()}`
    };
    auction.expenses = [newExpense, ...(auction.expenses || [])];
    await this.saveAuction(auction);
    return newExpense;
  }

  public async updateExpense(auctionId: string, expenseId: string, updated: Partial<AuctionExpense>): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    const idx = (auction.expenses || []).findIndex(e => e.id === expenseId);
    if (idx >= 0) {
      auction.expenses[idx] = { ...auction.expenses[idx], ...updated };
      await this.saveAuction(auction);
      return true;
    }
    return false;
  }

  public async deleteExpense(auctionId: string, expenseId: string): Promise<boolean> {
    const auction = await this.getAuctionById(auctionId);
    if (!auction) return false;
    auction.expenses = (auction.expenses || []).filter(e => e.id !== expenseId);
    await this.saveAuction(auction);
    return true;
  }
}

export const auctionService = new AuctionService();
