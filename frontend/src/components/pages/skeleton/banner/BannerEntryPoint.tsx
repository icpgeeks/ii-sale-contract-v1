import {AnonymousValidationBanner} from './AnonymousValidationBanner';
import {ContractBlockedBanner} from './ContractBlockedBanner';
import {CyclesTooLowBanner} from './CyclesTooLowBanner';
import {SaleDealAndCertificateExpiredBanner} from './SaleDealAndCertificateExpiredBanner';

export const BannerEntryPoint = () => {
    return (
        <>
            <AnonymousValidationBanner />
            <SaleDealAndCertificateExpiredBanner />
            <ContractBlockedBanner />
            <CyclesTooLowBanner />
        </>
    );
};
