import {ICPToken, isNullish} from '@dfinity/utils';
import {Typography} from 'antd';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';
import {PriceTemplateComponent} from './PriceTemplateComponent';

export const Price = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    return isOwnedByCurrentUser ? <OwnerComponent /> : <GuestComponent />;
};

const OwnerComponent = () => {
    const saleStatus = useIdentityHolderSaleStatus();
    const price = useMemo(() => {
        switch (saleStatus.type) {
            case 'noData':
            case 'saleIntentionNotSet':
            case 'notListed':
                return i18.holder.state.holding.common.topPanel.price.owner.notSet;
            case 'listed':
            case 'sold': {
                return (
                    <Typography.Title level={1} style={{lineHeight: 'var(--ant-font-size-heading-1)'}}>
                        {formatTokenAmountWithSymbol(saleStatus.price, ICPToken)}
                    </Typography.Title>
                );
            }
            default: {
                const exhaustiveCheck: never = saleStatus;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [saleStatus]);

    return <PriceTemplateComponent label={i18.holder.state.holding.common.topPanel.price.owner.title} price={price} />;
};

const GuestComponent = () => {
    const saleStatus = useIdentityHolderSaleStatus();

    const price = useMemo(() => {
        switch (saleStatus.type) {
            case 'noData':
            case 'saleIntentionNotSet':
            case 'notListed':
                return i18.holder.state.holding.common.topPanel.price.owner.notSet;

            case 'listed':
            case 'sold': {
                return (
                    <Typography.Title level={1} style={{lineHeight: 'var(--ant-font-size-heading-1)'}}>
                        {formatTokenAmountWithSymbol(saleStatus.price, ICPToken)}
                    </Typography.Title>
                );
            }
            default: {
                const exhaustiveCheck: never = saleStatus;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [saleStatus]);

    if (isNullish(price)) {
        return null;
    }

    return <PriceTemplateComponent label={i18.holder.state.holding.common.topPanel.price.guest.title} price={price} />;
};
