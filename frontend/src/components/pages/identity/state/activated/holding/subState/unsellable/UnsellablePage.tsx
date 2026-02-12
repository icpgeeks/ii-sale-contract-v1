import {isNullish} from '@dfinity/utils';
import {Flex, Tag} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {MAX_NUMBER_OF_ACCOUNTS, MAX_NUMBER_OF_NEURONS} from 'frontend/src/constants';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ReactNode} from 'react';
import {useMemo} from 'react';
import {RefreshHolderButton} from '../../../common/RefreshHolderButton';
import {StartReleaseButton} from '../../common/action/seller/startRelease/StartReleaseButton';
import {AssetPanel} from '../../common/assets/AssetPanel';
import {HoldingPanelHeader} from '../../common/HoldingPanelHeader';
import {HolderStats} from '../hold/identity/topPanel/stats/HolderStats';

export const UnsellablePage = () => {
    return (
        <Flex vertical gap={16}>
            <PanelCard>
                <Flex vertical gap={16}>
                    <Flex vertical gap={8}>
                        <Flex justify="space-between">
                            <HoldingPanelHeader />
                            <RefreshHolderButton />
                        </Flex>
                        <Flex gap={8} wrap>
                            <Tag color="red">{i18.holder.state.holding.common.topPanel.saleStatus.saleNotAllowed}</Tag>
                        </Flex>
                    </Flex>
                    <HolderStats />
                    <ErrorAlert message={<Reason />} />
                    <StartReleaseButton type="primary" />
                </Flex>
            </PanelCard>
            <ErrorBoundaryComponent childComponentName="AssetPanel">
                <AssetPanel />
            </ErrorBoundaryComponent>
        </Flex>
    );
};

const Reason = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const unsellableSubState = useMemo(() => getSubStateValue('Holding', 'Unsellable'), [getSubStateValue]);

    return useMemo<ReactNode>(() => {
        const union = getSingleEntryUnion(unsellableSubState?.reason);
        if (isNullish(union)) {
            return null;
        }
        const {type} = union;
        switch (type) {
            case 'ValidationFailed': {
                return i18.holder.state.holding.unsellable.reason.validationFailed;
            }
            case 'CertificateExpired': {
                return i18.holder.state.holding.unsellable.reason.certificateExpired;
            }
            case 'CheckLimitFailed': {
                const reasonUnion = getSingleEntryUnion(union?.state.reason);
                if (isNullish(reasonUnion)) {
                    return null;
                }
                switch (reasonUnion.type) {
                    case 'TooManyNeurons': {
                        return i18.holder.state.holding.unsellable.reason.checkLimitNeuronsFailed(MAX_NUMBER_OF_NEURONS);
                    }
                    case 'TooManyAccounts':
                        return i18.holder.state.holding.unsellable.reason.checkLimitAccountsFailed(MAX_NUMBER_OF_ACCOUNTS);
                    default: {
                        const exhaustiveCheck: never = reasonUnion;
                        applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                        return null;
                    }
                }
            }
            case 'ApproveOnAccount': {
                return i18.holder.state.holding.unsellable.reason.approveOnAccount;
            }
            case 'SaleDealCompleted': {
                /**
                 * illegal state - we should not reach here
                 * When sale is completed we should show "identity" page with assets but not this stub page.
                 */
                return null;
            }
            default: {
                const exhaustiveCheck: never = type;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return null;
            }
        }
    }, [unsellableSubState]);
};
