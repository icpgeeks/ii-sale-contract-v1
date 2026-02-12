import {Flex, Typography} from 'antd';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';
import {useAddControllerModalDataContext} from './AddControllerModalDataProvider';
import {ContentStepEnteringAccount} from './content/enteringAccount/ContentStepEnteringAccount';
import {ContentStepLoadingInitialData} from './content/loadingInitialData/ContentStepLoadingInitialData';
import {ContentStepSuccess} from './content/success/ContentStepSuccess';

export const AddControllerModal = () => {
    const {step, modalTitle} = useAddControllerModalDataContext();

    const content = useMemo(() => {
        switch (step) {
            case 'loadingInitialData':
                return <ContentStepLoadingInitialData />;
            case 'enteringPrincipal':
                return <ContentStepEnteringAccount />;
            case 'success':
                return <ContentStepSuccess />;
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
