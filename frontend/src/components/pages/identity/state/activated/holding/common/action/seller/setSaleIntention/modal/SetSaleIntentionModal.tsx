import {Flex, Typography} from 'antd';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';
import {ContentStepAccountConfirmation} from './content/accountConfirmation/ContentStepAccountConfirmation';
import {ContentStepChoosingAccountSource} from './content/choosingAccountSource/ContentStepChoosingAccountSource';
import {ContentStepEnteringAccount} from './content/enteringAccount/ContentStepEnteringAccount';
import {ContentStepLoadingAccountTransactions} from './content/loadingAccountTransactions/ContentStepLoadingAccountTransactions';
import {ContentStepLoadingInitialData} from './content/loadingInitialData/ContentStepLoadingInitialData';
import {useSetSaleIntentionModalDataContext} from './SetSaleIntentionModalDataProvider';

export const SetSaleIntentionModal = () => {
    const {step, modalTitle} = useSetSaleIntentionModalDataContext();

    const content = useMemo(() => {
        switch (step) {
            case 'loadingInitialData':
                return <ContentStepLoadingInitialData />;
            case 'choosingAccountSource':
                return <ContentStepChoosingAccountSource />;
            case 'enteringAccount':
                return <ContentStepEnteringAccount />;
            case 'loadingAccountTransactions':
                return <ContentStepLoadingAccountTransactions />;
            case 'accountConfirmation':
                return <ContentStepAccountConfirmation />;
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [step]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={4}>{modalTitle}</Typography.Title>
            {content}
        </Flex>
    );
};
