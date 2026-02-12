import {nonNullish} from '@dfinity/utils';

/**
 * @see https://github.com/dfinity/internet-identity/blob/main/src/frontend/src/lib/utils/iiConnection.ts#L1268
 */
export const remapToLegacyDomain = (origin: string): string => {
    const ORIGIN_MAPPING_REGEX = /^https:\/\/(?<subdomain>[\w-]+(?:\.raw)?)\.icp0\.io$/;
    const match = origin.match(ORIGIN_MAPPING_REGEX);
    const subdomain = match?.groups?.subdomain;
    if (nonNullish(subdomain)) {
        return `https://${subdomain}.ic0.app`;
    } else {
        return origin;
    }
};
