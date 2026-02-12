import {AccountIdentifier, SubAccount} from '@dfinity/ledger-icp';
import {isNullish, nonNullish} from '@dfinity/utils';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {caughtErrorMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {arrayToUint8Array} from 'frontend/src/utils/core/array/array';
import {MILLIS_PER_SECOND} from 'frontend/src/utils/core/date/constants';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {toError} from 'frontend/src/utils/core/error/toError';
import {MAINNET_GOVERNANCE_CANISTER_ID} from 'frontend/src/utils/ic/constants';
import {NeuronState} from 'frontend/src/utils/ic/nns/governance.enums';

export const getNeuronAgeFormatted = (neuronState: number, ageSeconds: bigint): string | undefined => {
    if (neuronState != NeuronState.Locked) {
        return undefined;
    }

    if (isNullish(ageSeconds)) {
        return undefined;
    }

    const ageMillis = Number(ageSeconds) * MILLIS_PER_SECOND;
    if (ageMillis < 0) {
        return undefined;
    }
    const durationLabel = formatDuration(ageMillis);
    if (isNullish(durationLabel)) {
        return i18.holder.state.holding.common.neurons.age.tooLow;
    }
    return i18.holder.state.holding.common.neurons.age.label(durationLabel);
};

export const getNeuronDissolveDelayFormatted = (neuronState: number, dissolveDelaySeconds: bigint): {value: string; type: 'dissolveDelay' | 'remaining'} | undefined => {
    if (nonNullish(dissolveDelaySeconds) && dissolveDelaySeconds > 0n) {
        const durationMillis = Number(dissolveDelaySeconds) * MILLIS_PER_SECOND;
        const durationLabel = formatDuration(durationMillis) ?? i18.holder.state.holding.common.neurons.dissolveDelay.tooLow;
        if (neuronState == NeuronState.Dissolving) {
            /**
             * Remaining time to dissolve
             */
            return {value: durationLabel, type: 'remaining'};
        } else if (neuronState == NeuronState.Locked) {
            /**
             * Dissolve delay time
             */
            return {value: durationLabel, type: 'dissolveDelay'};
        }
    }
};

export const getNeuronAccountIdentifier = (neuronAccount: Uint8Array | Array<number>): string | undefined => {
    try {
        const subAccount = SubAccount.fromBytes(arrayToUint8Array(neuronAccount));
        if (isNullish(subAccount) || subAccount instanceof Error) {
            return undefined;
        }
        const res = AccountIdentifier.fromPrincipal({
            principal: MAINNET_GOVERNANCE_CANISTER_ID,
            subAccount
        });
        return res.toHex();
    } catch (e) {
        applicationLogger.error(caughtErrorMessage('getNeuronAccountIdentifier:'), toError(e));
    }
};
