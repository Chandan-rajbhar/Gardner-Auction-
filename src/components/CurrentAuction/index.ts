/* eslint-disable react-refresh/only-export-components */
import { CurrentAuctionPage } from './CurrentAuctionPage';
import {
  INITIAL_CATALOG_LOTS,
  CURRENT_AUCTIONS,
  CURRENT_AUCTION_LOT_ITEMS,
  adaptCatalogLotToLotItem
} from '../../data/currentAuctionData';
import type {
  BidEntry,
  CategoryKey,
  CatalogLot,
  CurrentAuction
} from '../../data/currentAuctionData';

export {
  CurrentAuctionPage,
  INITIAL_CATALOG_LOTS,
  CURRENT_AUCTIONS,
  CURRENT_AUCTION_LOT_ITEMS,
  adaptCatalogLotToLotItem
};

export type {
  BidEntry,
  CategoryKey,
  CatalogLot,
  CurrentAuction
};

export default CurrentAuctionPage;
