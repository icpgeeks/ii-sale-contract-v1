import {Tag} from 'antd';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {NotListedTag} from './NotListedTag';

export const ListingStatusTag = () => {
    const saleStatus = useIdentityHolderSaleStatus();

    const label = useMemo(() => {
        const {type} = saleStatus;
        switch (type) {
            case 'noData':
            case 'saleIntentionNotSet':
            case 'notListed': {
                return <NotListedTag />;
            }
            case 'listed': {
                return <Tag color="green">{i18.holder.state.holding.common.topPanel.saleStatus.listed}</Tag>;
            }
            case 'sold': {
                // illegal state - we should not reach here
                return null;
            }
            default: {
                const exhaustiveCheck: never = type;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return null;
    }, [saleStatus]);

    return label;
};
