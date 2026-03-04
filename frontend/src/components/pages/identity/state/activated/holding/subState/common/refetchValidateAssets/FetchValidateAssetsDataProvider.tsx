import {fromNullable, fromNullishNullable, isNullish, nonNullish} from '@dfinity/utils';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {isSlotFullyFetched} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {isNonEmptyArray} from 'frontend/src/utils/core/array/array';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';
import type {
    AccountsInformation,
    CheckAssetsState,
    FetchAssetsState,
    FetchIdentityAccountsNnsAssetsState,
    FetchNnsAssetsState,
    HolderAssets,
    HoldingState,
    NeuronAsset
} from 'src/declarations/contract/contract.did';

// ─── Inner level (NNS sub-steps for one identity account slot) ───────────────

type NnsAssetsStepType = 'obtainDelegation' | 'neuronIds' | 'neurons' | 'deletingNeuronHotkeys' | 'accounts' | 'accountBalances' | 'finishCurrentNnsAccountFetch' | 'n/a';

type NnsAssetsStepProto<T extends NnsAssetsStepType> = {
    type: T;
};

type NnsAssetsStepNeurons = NnsAssetsStepProto<'neurons'> & {
    neuronsLeft: number;
};

type NnsAssetsStepDeletingNeuronHotkeys = NnsAssetsStepProto<'deletingNeuronHotkeys'> & {
    hotkeysLeft: number;
};

type NnsAssetsStepAccountBalances = NnsAssetsStepProto<'accountBalances'> & {
    accountsLeft: number;
};

export type NnsAssetsStep =
    | NnsAssetsStepProto<'obtainDelegation'>
    | NnsAssetsStepProto<'neuronIds'>
    | NnsAssetsStepNeurons
    | NnsAssetsStepDeletingNeuronHotkeys
    | NnsAssetsStepProto<'accounts'>
    | NnsAssetsStepAccountBalances
    | NnsAssetsStepProto<'finishCurrentNnsAccountFetch'>
    | NnsAssetsStepProto<'n/a'>;

// ─── Outer level (top-level holding flow steps) ───────────────────────────────

type HoldingStepType = 'fetchingIdentityAccounts' | 'fetchingNnsAssetsForAccount' | 'assetsFetchedButNotChecked' | 'checkAccountApproves' | 'validatingAssets' | 'n/a';

type HoldingStepProto<T extends HoldingStepType> = {
    type: T;
};

type HoldingStepFetchingNnsAssetsForAccount = HoldingStepProto<'fetchingNnsAssetsForAccount'> & {
    currentAccountIndex: number;
    totalAccounts: number;
    //TODO check if it is used and remove if not
    accountsLeft: number;
    innerStep: NnsAssetsStep;
};

type HoldingStepCheckAccountApproves = HoldingStepProto<'checkAccountApproves'> & {
    accountsLeft: number;
};

export type HoldingStep =
    | HoldingStepProto<'fetchingIdentityAccounts'>
    | HoldingStepFetchingNnsAssetsForAccount
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
        const result = getStepFromHoldingState(holdingState, fetchingAssets);

        const stepLabel = result.type === 'fetchingNnsAssetsForAccount' ? `${result.type}/${result.innerStep.type}` : result.type;
        applicationLogger.debug('Updating FetchValidateAssetsDataProvider context value', stepLabel, {result, holdingState, fetchingAssets});

        return result;
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
        case 'StartFetchAssets': {
            return {type: 'fetchingIdentityAccounts'};
        }
        case 'FetchIdentityAccountsNnsAssetsState': {
            return getStepFromFetchIdentityAccountsState(union.state.sub_state, fetchingAssets);
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

const getStepFromFetchIdentityAccountsState = (state: FetchIdentityAccountsNnsAssetsState, fetchingAssets: HolderAssets | undefined): HoldingStep => {
    const defaultResult: HoldingStep = {type: 'n/a'};
    const union = getSingleEntryUnion(state);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'GetIdentityAccounts': {
            return {type: 'fetchingIdentityAccounts'};
        }
        case 'FetchNnsAssetsState': {
            const slots = nonNullish(fetchingAssets) ? (fromNullable(fetchingAssets.nns_assets) ?? []) : [];
            const totalAccounts = slots.length;
            const completedCount = slots.filter(isSlotFullyFetched).length;
            const accountsLeft = totalAccounts - completedCount;
            const currentAccountIndex = Math.min(completedCount + 1, totalAccounts);
            const currentAccNum = fromNullable(union.state.identity_account_number);
            const foundSlotIndex = nonNullish(currentAccNum)
                ? slots.findIndex((s) => fromNullable(s.identity_account_number) === currentAccNum)
                : slots.findIndex((s) => isNullish(fromNullable(s.identity_account_number)));
            if (foundSlotIndex < 0) {
                applicationLogger.log('Slot not found in fetchingAssets for current identity_account_number, falling back to completedCount', {currentAccNum, totalAccounts, completedCount});
            }
            const slotIndex = foundSlotIndex >= 0 ? foundSlotIndex : completedCount;
            const innerStep = getStepFromNNS(union.state.sub_state, fetchingAssets, slotIndex);
            return {type: 'fetchingNnsAssetsForAccount', currentAccountIndex, totalAccounts, accountsLeft, innerStep};
        }
        case 'FinishCurrentNnsAccountFetch': {
            const slots = nonNullish(fetchingAssets) ? (fromNullable(fetchingAssets.nns_assets) ?? []) : [];
            const totalAccounts = slots.length;
            const completedCount = slots.filter(isSlotFullyFetched).length;
            const accountsLeft = totalAccounts - completedCount;
            if (accountsLeft > 0) {
                const currentAccountIndex = Math.min(completedCount + 1, totalAccounts);
                return {type: 'fetchingNnsAssetsForAccount', currentAccountIndex, totalAccounts, accountsLeft, innerStep: {type: 'finishCurrentNnsAccountFetch'}};
            }
            return {type: 'assetsFetchedButNotChecked'};
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getStepFromNNS = (state: FetchNnsAssetsState, fetchingAssets: HolderAssets | undefined, slotIndex: number): NnsAssetsStep => {
    const defaultResult: NnsAssetsStep = {type: 'n/a'};
    const union = getSingleEntryUnion(state);
    if (isNullish(union)) {
        return defaultResult;
    }
    const type = union.type;
    switch (type) {
        case 'ObtainDelegationState': {
            return {type: 'obtainDelegation'};
        }
        case 'GetNeuronsIds': {
            return {type: 'neuronIds'};
        }
        case 'GetNeuronsInformation': {
            return getHoldingStepNeurons(fetchingAssets, slotIndex);
        }
        case 'DeletingNeuronsHotkeys': {
            const hotkeysLeft = union.state.neuron_hotkeys.map((v) => v[1].length).reduce((v, acc) => v + acc, 0);
            return {type: 'deletingNeuronHotkeys', hotkeysLeft};
        }
        case 'GetAccountsInformation': {
            return {type: 'accounts'};
        }
        case 'GetAccountsBalances': {
            return getHoldingStepAccountBalances(fetchingAssets, slotIndex);
        }
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};

const getHoldingStepNeurons = (fetchingAssets: HolderAssets | undefined, slotIndex: number): NnsAssetsStepNeurons => {
    const result: NnsAssetsStepNeurons = {type: 'neurons', neuronsLeft: 0};
    if (nonNullish(fetchingAssets)) {
        const slot = (fromNullable(fetchingAssets.nns_assets) ?? [])[slotIndex];
        const slotAssets = nonNullish(slot) ? fromNullishNullable(slot.assets) : undefined;
        if (nonNullish(slotAssets)) {
            const neuronAssets: Array<NeuronAsset> = fromNullable(slotAssets.controlled_neurons)?.value ?? [];
            if (isNonEmptyArray(neuronAssets)) {
                const neuronsTotal = neuronAssets.length;
                const neuronsFound = neuronAssets.filter((asset) => nonNullish(fromNullable(asset.info))).length;
                result.neuronsLeft = neuronsTotal - neuronsFound;
            }
        }
    }
    return result;
};

const getHoldingStepAccountBalances = (fetchingAssets: HolderAssets | undefined, slotIndex: number): NnsAssetsStepAccountBalances => {
    const result: NnsAssetsStepAccountBalances = {type: 'accountBalances', accountsLeft: 0};
    if (nonNullish(fetchingAssets)) {
        const slot = (fromNullable(fetchingAssets.nns_assets) ?? [])[slotIndex];
        const slotAssets = nonNullish(slot) ? fromNullishNullable(slot.assets) : undefined;
        if (nonNullish(slotAssets)) {
            const accountsInformation: AccountsInformation | undefined = fromNullishNullable(fromNullable(slotAssets.accounts)?.value);
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
    }
    return result;
};
