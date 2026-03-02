import {CheckCircleOutlined} from '@ant-design/icons';
import {isNullish} from '@dfinity/utils';
import {Steps, type StepProps} from 'antd';
import {LoadingIconWithProgress} from 'frontend/src/components/widgets/LoadingIconWithProgress';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useFetchValidateAssetsDataContext, type NnsAssetsStep} from './FetchValidateAssetsDataProvider';

type NnsStepContext = {
    current: number;
    items: Array<StepProps>;
};

const getNnsAssetsStepProps = (): Array<StepProps> => {
    return [
        {title: i18.holder.state.holding.fetchingAssets.connectingToNNS, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.fetchingNeurons.simple, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.removingHotkeys.simple, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.fetchingAccounts.simple, status: undefined}
    ];
};

const getNnsStepContextFrom = (innerStep: NnsAssetsStep): NnsStepContext => {
    const items = getNnsAssetsStepProps();
    let current = 0;

    switch (innerStep.type) {
        case 'obtainDelegation': {
            current = 0;
            break;
        }
        case 'neuronIds': {
            current = 1;
            break;
        }
        case 'neurons': {
            current = 1;
            if (innerStep.neuronsLeft > 0) {
                items[1].title = (
                    <div>
                        <span>{i18.holder.state.holding.fetchingAssets.fetchingNeurons.simple}</span>{' '}
                        <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.fetchingNeurons.detailed(innerStep.neuronsLeft)}</span>
                    </div>
                );
            }
            break;
        }
        case 'deletingNeuronHotkeys': {
            current = 2;
            if (innerStep.hotkeysLeft > 0) {
                items[2].title = (
                    <div>
                        <span>{i18.holder.state.holding.fetchingAssets.removingHotkeys.simple}</span>{' '}
                        <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.removingHotkeys.detailed(innerStep.hotkeysLeft)}</span>
                    </div>
                );
            }
            break;
        }
        case 'accounts': {
            current = 3;
            break;
        }
        case 'accountBalances': {
            current = 3;
            if (innerStep.accountsLeft > 0) {
                items[3].title = (
                    <div>
                        <span>{i18.holder.state.holding.fetchingAssets.fetchingAccounts.simple}</span>{' '}
                        <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.fetchingAccounts.detailed(innerStep.accountsLeft)}</span>
                    </div>
                );
            }
            break;
        }
        case 'n/a': {
            current = 0;
            break;
        }
        default: {
            const exhaustiveCheck: never = innerStep;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
        }
    }

    items[current].icon = <LoadingIconWithProgress />;
    for (let i = 0; i < current; i++) {
        items[i].icon = <CheckCircleOutlined style={{fontSize: 24, color: 'green'}} />;
    }

    return {current, items};
};

export const FetchNnsAssetsSteps = () => {
    const {step} = useFetchValidateAssetsDataContext();

    const ctx: NnsStepContext | undefined = useMemo(() => {
        if (isNullish(step) || step.type !== 'fetchingNnsAssetsForAccount') {
            return undefined;
        }
        return getNnsStepContextFrom(step.innerStep);
    }, [step]);

    if (isNullish(ctx)) {
        return null;
    }

    return <Steps current={ctx.current} items={ctx.items} labelPlacement="vertical" direction="horizontal" size="small" />;
};
