import {BASE_EXTERNAL_REPOSITORY_PAGE_URL} from 'frontend/src/constants';
import queryString from 'query-string';

export const PATH_HOME = '/';
export const PATH_STATUS = '/status';
export const PATH_STATUS_ADVANCED = `${PATH_STATUS}/advanced`;
export const PATH_ABOUT = '/about';
export const PATH_SETTINGS = '/settings';

export type FAQFragment = 'contract-certificate' | 'safety-window' | 'activation' | 'validation' | 'top-up' | 'transfer-to' | 'transfer-from' | 'risks' | 'template-blocked';

export const RouterPaths = {
    hubContractTemplate: (hubCanisterId: string, contractTemplateId: string) => {
        return queryString.stringifyUrl({url: `https://${hubCanisterId}.icp0.io/templates/${contractTemplateId}`});
    },
    externalRepositoryPage: () => {
        return externalRepositoryPageUrl('');
    },
    externalTermsOfUsePage: (fragmentIdentifier?: string) => {
        return externalRepositoryPageUrl('TERMS.md', fragmentIdentifier);
    },
    externalFAQPage: (fragmentIdentifier?: FAQFragment) => {
        return externalRepositoryPageUrl('FAQ.md', fragmentIdentifier);
    }
};

const externalRepositoryPageUrl = (page: string, fragmentIdentifier?: string) => {
    return queryString.stringifyUrl({url: `${BASE_EXTERNAL_REPOSITORY_PAGE_URL}${page}`, fragmentIdentifier}, {skipEmptyString: true});
};
