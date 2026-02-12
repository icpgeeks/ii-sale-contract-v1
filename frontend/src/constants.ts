import {ICPToken} from '@dfinity/utils';
import {MILLIS_PER_DAY, MILLIS_PER_SECOND} from './utils/core/date/constants';
import {formatTokenAmount} from './utils/core/token/token';
import {U64_MAX_VALUE} from './utils/ic/constants';

/**
==========================================
Following constants should be kept in sync with backend factory.rs
==========================================
*/
export const MIN_PRICE_ICP_INCLUSIVE_ULPS: bigint = 1_0000_0000n;
export const MIN_PRICE_ICP_INCLUSIVE = formatTokenAmount(MIN_PRICE_ICP_INCLUSIVE_ULPS, ICPToken);

export const MAX_NUMBER_OF_ACCOUNTS = 1000;
export const MAX_NUMBER_OF_NEURONS = 1000;

export const REFERRAL_REWARD_PERMYRIAD = 100n;
export const DEVELOPER_REWARD_PERMYRIAD = 50n;
export const HUB_REWARD_PERMYRIAD = 50n;

export const MAX_REFERRAL_LENGTH = 1024;

export const SALE_DEAL_SAFE_CLOSE_DURATION = 10 * MILLIS_PER_DAY;

/**
==========================================
UI constants
==========================================
*/
export const SESSION_TIME_TO_LIVE_MILLIS = BigInt(MILLIS_PER_DAY);

export const MODAL_WIDTH = 615;

export const PAGE_SIZE = {
    DEFAULT: 10,
    accounts: 30,
    neurons: 30,
    offers: 30,
    contractEvents: 10,
    browserEvents: 10
};

export const BASE_EXTERNAL_REPOSITORY_PAGE_URL = `https://github.com/icpgeeks/ii-sale-contract-v1/blob/main/`;

export const CONTRACT_WILL_EXPIRE_SOON_THRESHOLD_MILLIS = 10 * MILLIS_PER_DAY;
export const EXPIRATION_OFFSETS: Array<number> = [CONTRACT_WILL_EXPIRE_SOON_THRESHOLD_MILLIS + SALE_DEAL_SAFE_CLOSE_DURATION, SALE_DEAL_SAFE_CLOSE_DURATION];

export const MAX_SALE_PRICE_ICP_ULPS = U64_MAX_VALUE;

export const HOLDER_LOCKED_CLIENT_DELAY_MILLIS = MILLIS_PER_SECOND * 5;
