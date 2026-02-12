import {fromNullable, fromNullishNullable, isNullish, nonNullish} from '@dfinity/utils';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {isNonEmptyArray} from 'frontend/src/utils/core/array/array';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';
import type {AccountsInformation, CheckAssetsState, FetchAssetsState, FetchNnsAssetsState, HolderAssets, HoldingState, NeuronAsset} from 'src/declarations/contract/contract.did';

type HoldingStepType =
    | 'obtainDelegation'
    | 'neuronIds'
    | 'neurons'
    | 'deletingNeuronHotkeys'
    | 'accounts'
    | 'accountBalances'
    | 'assetsFetchedButNotChecked'
    | 'checkAccountApproves'
    | 'validatingAssets'
    | 'n/a';

type HoldingStepProto<T extends HoldingStepType> = {
    type: T;
};

type HoldingStepNeurons = HoldingStepProto<'neurons'> & {
    neuronsLeft: number;
};

type HoldingStepDeletingNeuronHotkeys = HoldingStepProto<'deletingNeuronHotkeys'> & {
    hotkeysLeft: number;
};

type HoldingStepAccountBalances = HoldingStepProto<'accountBalances'> & {
    accountsLeft: number;
};

type HoldingStepCheckAccountApproves = HoldingStepProto<'checkAccountApproves'> & {
    accountsLeft: number;
};

export type HoldingStep =
    | HoldingStepProto<'obtainDelegation'>
    | HoldingStepProto<'neuronIds'>
    | HoldingStepNeurons
    | HoldingStepDeletingNeuronHotkeys
    | HoldingStepProto<'accounts'>
    | HoldingStepAccountBalances
    | HoldingStepProto<'assetsFetchedButNotChecked'>
    | HoldingStepCheckAccountApproves
    | HoldingStepProto<'validatingAssets'>
    | HoldingStepProto<'n/a'>;

type Context = {
    step?: HoldingStep;
};

const Context = createContext<Context | undefined>(undefined);
export const useFetchValidateAssetsDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useFetchValidateAssetsDataContext must be used within a FetchValidateAssetsDataProvider');
    }
    return context;
};

export const FetchValidateAssetsDataProvider = (props: PropsWithChildren) => {
    const {fetchingAssets} = useIdentityHolderAssetsContext();
    const {getStateSubState: getState} = useIdentityHolderStateContext();
    const holdingState = useMemo(() => getState('Holding'), [getState]);

    const step: HoldingStep | undefined = useMemo(() => {
        if (isNullish(holdingState)) {
            return undefined;
        }
        return getStepFromHoldingState(holdingState, fetchingAssets);
    }, [holdingState, fetchingAssets]);

    const value = useMemo<Context>(() => {
        return {step};
    }, [step]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};

export const getStepFromHoldingState = (subState: HoldingState, fetchingAssets: HolderAssets | undefined): HoldingStep => {
    const defaultResult: HoldingStep = {type: 'n/a'};
    const union = getSingleEntryUnion(subState);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'StartHolding':
        case 'CancelSaleDeal':
        case 'Unsellable':
        case 'Hold': {
            return defaultResult;
        }
        case 'ValidateAssets': {
            return {type: 'validatingAssets'};
        }
        case 'FetchAssets': {
            return getStepFromFetchAssetsState(union.state.fetch_assets_state, fetchingAssets);
        }
        case 'CheckAssets': {
            return getStepFromCheckAssetsState(union.state.sub_state);
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getStepFromCheckAssetsState = (state: CheckAssetsState): HoldingStep => {
    const defaultResult: HoldingStep = {type: 'n/a'};
    const union = getSingleEntryUnion(state);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'StartCheckAssets':
        case 'CheckAccountsForNoApprovePrepare': {
            return {type: 'assetsFetchedButNotChecked'};
        }
        case 'CheckAccountsForNoApproveSequential': {
            const accountsLeft = union.state.sub_accounts.length;
            return {type: 'checkAccountApproves', accountsLeft};
        }
        case 'FinishCheckAssets': {
            return {type: 'checkAccountApproves', accountsLeft: 0};
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getStepFromFetchAssetsState = (state: FetchAssetsState, fetchingAssets: HolderAssets | undefined): HoldingStep => {
    const defaultResult: HoldingStep = {type: 'n/a'};
    const union = getSingleEntryUnion(state);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'ObtainDelegationState': {
            return {type: 'obtainDelegation'};
        }
        case 'StartFetchAssets': {
            return {type: 'obtainDelegation'};
        }
        case 'FetchNnsAssetsState': {
            return getStepFromNNS(union.state.sub_state, fetchingAssets);
        }
        case 'FinishFetchAssets': {
            return {type: 'assetsFetchedButNotChecked'};
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getStepFromNNS = (state: FetchNnsAssetsState, fetchingAssets: HolderAssets | undefined): HoldingStep => {
    const defaultResult: HoldingStep = {type: 'n/a'};
    const union = getSingleEntryUnion(state);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'GetNeuronsIds': {
            return {type: 'neuronIds'};
        }
        case 'GetNeuronsInformation': {
            return getHoldingStepNeurons(fetchingAssets);
        }
        case 'DeletingNeuronsHotkeys': {
            const hotkeysLeft = union.state.neuron_hotkeys.map((v) => v[1].length).reduce((v, acc) => v + acc, 0);
            return {type: 'deletingNeuronHotkeys', hotkeysLeft};
        }
        case 'GetAccountsInformation': {
            return {type: 'accounts'};
        }
        case 'GetAccountsBalances': {
            return getHoldingStepAccountBalances(fetchingAssets);
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getHoldingStepNeurons = (fetchingAssets: HolderAssets | undefined): HoldingStepNeurons => {
    const result: HoldingStepNeurons = {type: 'neurons', neuronsLeft: 0};
    if (nonNullish(fetchingAssets)) {
        const neuronAssets: Array<NeuronAsset> | undefined = fromNullable(fetchingAssets.controlled_neurons)?.value;
        if (isNonEmptyArray(neuronAssets)) {
            const neuronsTotal = neuronAssets.length;
            const neuronsFound = neuronAssets.filter((asset) => nonNullish(fromNullable(asset.info))).length;
            result.neuronsLeft = neuronsTotal - neuronsFound;
        }
    }
    return result;
};
const getHoldingStepAccountBalances = (fetchingAssets: HolderAssets | undefined): HoldingStepAccountBalances => {
    const result: HoldingStepAccountBalances = {type: 'accountBalances', accountsLeft: 0};
    if (nonNullish(fetchingAssets)) {
        const accountsInformation: AccountsInformation | undefined = fromNullishNullable(fromNullable(fetchingAssets.accounts)?.value);
        if (nonNullish(accountsInformation)) {
            const mainAccountInformation = fromNullable(accountsInformation.main_account_information);
            const hasMainAccountBalance = nonNullish(fromNullishNullable(mainAccountInformation?.balance));
            if (!hasMainAccountBalance) {
                result.accountsLeft += 1;
            }

            const numberOfSubAccountsWithoutBalance = accountsInformation.sub_accounts.filter((subAccount) => {
                return isNullish(fromNullishNullable(subAccount.sub_account_information.balance));
            }).length;
            result.accountsLeft += numberOfSubAccountsWithoutBalance;
        }
    }
    return result;
};
