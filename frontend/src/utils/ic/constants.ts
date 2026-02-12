import {Principal} from '@dfinity/principal';
import {IS_DEV_ENVIRONMENT} from '../env';

export const U64_MAX_VALUE = 2n ** 64n - 1n;

export const INTERNET_IDENTITY_CANISTER_ID_TEXT = IS_DEV_ENVIRONMENT ? 'qhbym-qaaaa-aaaaa-aaafq-cai' : 'rdmx6-jaaaa-aaaaa-aaadq-cai';

export const INTERNET_IDENTITY_URL = import.meta.env.VITE_APP_INTERNET_IDENTITY_URL || 'https://id.ai';

export const LOCAL_REPLICA_API_PORT = 8080;
export const LOCAL_REPLICA_API_HOST = `http://localhost:${LOCAL_REPLICA_API_PORT}`;

export const IC_API_HOST = 'https://icp-api.io';

export const MAINNET_LEDGER_CANISTER_ID_TEXT = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
export const MAINNET_LEDGER_CANISTER_ID: Principal = Principal.fromText(MAINNET_LEDGER_CANISTER_ID_TEXT);

const MAINNET_INDEX_CANISTER_ID_TEXT = IS_DEV_ENVIRONMENT ? 'q3fc5-haaaa-aaaaa-aaahq-cai' : 'qhbym-qaaaa-aaaaa-aaafq-cai';
export const MAINNET_INDEX_CANISTER_ID: Principal = Principal.fromText(MAINNET_INDEX_CANISTER_ID_TEXT);

const MAINNET_GOVERNANCE_CANISTER_ID_TEXT = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
export const MAINNET_GOVERNANCE_CANISTER_ID: Principal = Principal.fromText(MAINNET_GOVERNANCE_CANISTER_ID_TEXT);
