import {isNullish, nonNullish, notEmptyString} from '@dfinity/utils';
import {MAX_REFERRAL_LENGTH} from 'frontend/src/constants';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {isNonEmptyString, trimIfDefined} from 'frontend/src/utils/core/string/string';
import {KeyValueStoreFacade} from 'frontend/src/utils/store/KeyValueStore';
import {useCallback, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const store = KeyValueStoreFacade.createStore('referral-');
const REFERRAL_URL_KEY = 'ref';
const REFERRAL_STORAGE_KEY = 'code';

const logMessagePrefix = `ReferralTracker:`;

export const ReferralTracker = () => {
    const navigate = useNavigate();

    const processReferralCode = useCallback(() => {
        try {
            const refFromUrl = getReferralCodeFromURL();
            saveReferral(refFromUrl);

            const queryStringWithoutReferral = removeReferralFromUrl();
            if (nonNullish(queryStringWithoutReferral)) {
                navigate(queryStringWithoutReferral, {replace: true});
            }
        } catch (error) {
            applicationLogger.error(`${logMessagePrefix} error processing referral code`, error);
        }
    }, [navigate]);

    useEffect(() => {
        processReferralCode();
    }, [processReferralCode]);

    return null;
};

export const getStoredReferralCode = () => {
    const referralCode = store.get(REFERRAL_STORAGE_KEY);
    if (isNonEmptyString(referralCode)) {
        return referralCode;
    }
    return undefined;
};

export const clearStoredReferralCode = () => {
    try {
        store.remove(REFERRAL_STORAGE_KEY);
    } catch (error) {
        applicationLogger.error(`${logMessagePrefix} error clearing stored referral code`, error);
    }
};

const getReferralCodeFromURL = (): string | undefined => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCodeFromUrl = trimIfDefined(urlParams.get(REFERRAL_URL_KEY));
    if (isNullish(referralCodeFromUrl) || referralCodeFromUrl.length > MAX_REFERRAL_LENGTH) {
        return undefined;
    }
    return referralCodeFromUrl;
};

const saveReferral = (referralCode: string | null | undefined) => {
    if (notEmptyString(referralCode)) {
        const storedReferralCode = store.get(REFERRAL_STORAGE_KEY);
        if (isNullish(storedReferralCode)) {
            try {
                store.set(REFERRAL_STORAGE_KEY, referralCode);
                applicationLogger.debug(`${logMessagePrefix} successfully saved referral code.`, {referralCode});
                return;
            } catch (error) {
                applicationLogger.error(`${logMessagePrefix} error saving referral code`, error);
            }
        }
    }
};

const removeReferralFromUrl = (): string | undefined => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (params.size == 0) {
        return '?';
    }
    if (!params.has(REFERRAL_URL_KEY)) {
        return undefined;
    }

    params.delete(REFERRAL_URL_KEY);

    const newQuery = params.toString();
    return `?${newQuery}`;
};
