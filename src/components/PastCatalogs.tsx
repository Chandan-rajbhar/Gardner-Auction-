/* eslint-disable react-refresh/only-export-components */
import { PAST_AUCTIONS, ALL_PAST_LOTS } from '../data/pastCatalogsData';
import type { PastAuction, PastLotItem } from '../data/pastCatalogsData';
import { PastCatalogsPage } from './PastCatalogsPage';

export { PAST_AUCTIONS, ALL_PAST_LOTS, PastCatalogsPage };
export type { PastAuction, PastLotItem };
export default PastCatalogsPage;
