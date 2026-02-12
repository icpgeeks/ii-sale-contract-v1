import {isNullish} from '@dfinity/utils';
import {trimIfDefined} from 'frontend/src/utils/core/string/string';
import {IS_DEV_ENVIRONMENT} from 'frontend/src/utils/env';
import {INTERNET_IDENTITY_CANISTER_ID_TEXT, LOCAL_REPLICA_API_PORT} from 'frontend/src/utils/ic/constants';

export const INTERNET_IDENTITY_PAIR_ORIGIN = IS_DEV_ENVIRONMENT ? `http://${INTERNET_IDENTITY_CANISTER_ID_TEXT}.localhost:${LOCAL_REPLICA_API_PORT}` : `https://id.ai`;
export const INTERNET_IDENTITY_PAIR_PATH = `/pair`;
export const INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH = 5;

const PAIR_URL_REGEX = new RegExp(`^${INTERNET_IDENTITY_PAIR_ORIGIN.replace(/\./g, '\\.')}` + `${INTERNET_IDENTITY_PAIR_PATH}` + `#([0-9a-zA-Z]{${INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH}})$`);

export const extractRegistrationId = (raw: string | undefined): string | undefined => {
    const input = trimIfDefined(raw);

    if (isNullish(input)) {
        return undefined;
    }

    const match = PAIR_URL_REGEX.exec(input);

    if (isNullish(match)) {
        return undefined;
    }

    return match[1] as string;
};

export const buildPairURL = (registrationId: string): string => {
    return `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${registrationId}`;
};
