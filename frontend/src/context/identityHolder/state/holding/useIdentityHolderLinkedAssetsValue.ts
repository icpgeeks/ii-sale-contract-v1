import {type Principal} from '@dfinity/principal';
import {fromNullable, fromNullishNullable, isNullish} from '@dfinity/utils';
import {compactArray, isEmptyArray} from 'frontend/src/utils/core/array/array';
import {getAccountIdentifierHexFromByteArraySafe} from 'frontend/src/utils/ic/account';
import {useCallback, useMemo} from 'react';

import {applicationLogger} from 'frontend/src/context/logger/logger';
import type {AccountInformation, AccountsInformation, HolderAssets, NeuronAsset, NeuronInformation, SubAccountInformation} from 'src/declarations/contract/contract.did';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';

type ContextNoAssets = {
    type: 'noAssets';
};

type ContextInvalidAssets = {
    type: 'invalidAssets';
};

type Account = {
    balanceUlps: bigint;
    accountIdentifierHex: string;
    timestampMillis: bigint;
};
export type MainAccount = Account & {
    type: 'main';
};
export type SubAccount = Account & {
    type: 'subAccount';
    name: string;
    subAccount: Uint8Array | Array<number>;
};
type Accounts = {
    principal: Principal;
    mainAccount: MainAccount;
    subAccounts: Array<SubAccount>;
    totalValueUlps: bigint;
    earliestTimestampMillis: bigint;
};

export type Neuron = {
    neuronId: bigint;
    timestampMillis: bigint;
    totalStakeUlps: bigint;
    state: number;
    ageSeconds: bigint;
    dissolveDelaySeconds: bigint;
    __rawNeuronInformation: NeuronInformation;
};
type Neurons = {
    totalStakeUlps: bigint;
    weightedAverageNeuronAge?: bigint;
    weightedAverageDissolveDelay?: bigint;
    neurons: Array<Neuron>;
    earliestTimestampMillis: bigint;
};

type ContextValidAssets = {
    type: 'assets';

    totalValueUlps: bigint;
    earliestTimestampMillis: bigint | undefined;

    accounts: Accounts | undefined;
    numberOfAccounts: number;
    neurons: Neurons | undefined;
    numberOfNeurons: number;
};

type Context = ContextValidAssets | ContextNoAssets | ContextInvalidAssets;

export const useIdentityHolderLinkedAssetsValue = (): Context => {
    const {holder, completedSaleDeal} = useIdentityHolderContext();

    const calculateAssetsValue: () => Context = useCallback(() => {
        const completedSaleAssets: HolderAssets | undefined = completedSaleDeal?.assets.value;
        const mainAssets: HolderAssets | undefined = fromNullishNullable(holder?.assets)?.value;
        const assets: HolderAssets | undefined = completedSaleAssets ?? mainAssets;

        if (isNullish(assets)) {
            return {type: 'noAssets'};
        }

        /**
         * parse accounts
         */
        const parsedAccounts = getAccounts(assets.accounts);
        if (parsedAccounts.type == 'invalidAccounts') {
            applicationLogger.log('Failed to parse accounts', {accounts: assets.accounts});
            return {type: 'invalidAssets'};
        }

        /**
         * parse neurons
         */
        const parsedNeurons = getControlledNeurons(assets.controlled_neurons);
        if (parsedNeurons.type == 'invalidNeurons') {
            applicationLogger.log('Failed to parse neurons', {neurons: assets.controlled_neurons});
            return {type: 'invalidAssets'};
        }

        if (parsedAccounts.type == 'noAccounts' && parsedNeurons.type == 'noNeurons') {
            return {type: 'noAssets'};
        }

        const accounts: Accounts | undefined = parsedAccounts.type == 'validAccounts' ? parsedAccounts.accounts : undefined;
        const accountsTotalValueUlps = accounts?.totalValueUlps ?? 0n;
        /**
         * +1 for main account
         */
        const numberOfAccounts = isNullish(accounts) ? 0 : accounts.subAccounts.length + 1;

        const neurons: Neurons | undefined = parsedNeurons.type == 'validNeurons' ? parsedNeurons.neurons : undefined;
        const numberOfNeurons = isNullish(neurons) ? 0 : neurons.neurons.length;
        const neuronsTotalValueUlps = neurons?.totalStakeUlps ?? 0n;

        const totalValueUlps = accountsTotalValueUlps + neuronsTotalValueUlps;
        const earliestTimestampMillisArray = compactArray([accounts?.earliestTimestampMillis, neurons?.earliestTimestampMillis]);
        const earliestTimestampMillis = isEmptyArray(earliestTimestampMillisArray) ? undefined : earliestTimestampMillisArray.reduce((a, b) => (a < b ? a : b));
        return {
            type: 'assets',
            earliestTimestampMillis,
            totalValueUlps,
            accounts,
            numberOfAccounts,
            neurons,
            numberOfNeurons
        };
    }, [holder, completedSaleDeal]);

    return useMemo<Context>(() => calculateAssetsValue(), [calculateAssetsValue]);
};

/**
==========================================
Accounts
==========================================
*/

const getAccounts = (accounts: HolderAssets['accounts']): {type: 'noAccounts'} | {type: 'invalidAccounts'} | {type: 'validAccounts'; accounts: Accounts} => {
    const accountsInformation: AccountsInformation | undefined = fromNullishNullable(fromNullable(accounts)?.value);
    if (isNullish(accountsInformation)) {
        return {type: 'noAccounts'};
    }
    /**
     * principal
     */
    const {principal} = accountsInformation;
    /**
     * main account
     */
    const mainAccount: MainAccount | undefined = getMainAccount(fromNullable(accountsInformation.main_account_information));
    if (isNullish(mainAccount)) {
        return {type: 'invalidAccounts'};
    }
    /**
     * subaccounts
     */
    if (accountsInformation.sub_accounts.length == 0) {
        return {
            type: 'validAccounts',
            accounts: {
                principal,
                mainAccount,
                subAccounts: [],
                totalValueUlps: mainAccount.balanceUlps,
                earliestTimestampMillis: mainAccount.timestampMillis
            }
        };
    }
    const subAccounts: Array<SubAccount> = compactArray(accountsInformation.sub_accounts.map(getSubAccount));
    if (subAccounts.length == 0) {
        return {type: 'invalidAccounts'};
    }
    const totalValueUlps = subAccounts.reduce((acc, subAccount) => acc + subAccount.balanceUlps, mainAccount.balanceUlps);
    const earliestTimestampMillis = [mainAccount.timestampMillis, ...subAccounts.map((v) => v.timestampMillis)].reduce((a, b) => (a < b ? a : b));
    return {
        type: 'validAccounts',
        accounts: {
            principal,
            mainAccount,
            subAccounts,
            totalValueUlps,
            earliestTimestampMillis
        }
    };
};

const getAccount = (accountInformation: AccountInformation | undefined): Account | undefined => {
    if (isNullish(accountInformation)) {
        return undefined;
    }
    const {balance, account_identifier} = accountInformation;
    const timestamped = fromNullishNullable(balance);
    if (isNullish(timestamped)) {
        return undefined;
    }
    const balanceUlps = timestamped.value;
    const timestampMillis = timestamped.timestamp;
    const accountIdentifierHex = getAccountIdentifierHexFromByteArraySafe(account_identifier);
    if (isNullish(accountIdentifierHex)) {
        return undefined;
    }
    return {
        balanceUlps,
        accountIdentifierHex,
        timestampMillis
    };
};

const getMainAccount = (accountInformation: AccountInformation | undefined): MainAccount | undefined => {
    if (isNullish(accountInformation)) {
        return undefined;
    }
    const account: Account | undefined = getAccount(accountInformation);
    if (isNullish(account)) {
        return undefined;
    }
    return {
        type: 'main',
        ...account
    };
};

const getSubAccount = (subAccountInformation: SubAccountInformation | undefined): SubAccount | undefined => {
    if (isNullish(subAccountInformation)) {
        return undefined;
    }
    const account: Account | undefined = getAccount(subAccountInformation?.sub_account_information);
    if (isNullish(account)) {
        applicationLogger.log('Failed to parse subaccount', {subAccountInformation});
        return undefined;
    }
    return {
        type: 'subAccount',
        ...account,
        name: subAccountInformation.name,
        subAccount: subAccountInformation.sub_account
    };
};

/**
==========================================
Neurons
==========================================
*/

const getNeuronTotalStakeUlps = (neuronInformation: NeuronInformation): bigint => {
    const {cached_neuron_stake_e8s, maturity_e8s_equivalent, staked_maturity_e8s_equivalent} = neuronInformation;
    const staked_maturity_e8s_equivalent_value = fromNullable(staked_maturity_e8s_equivalent) ?? 0n;
    const neuron_fees_e8s = neuronInformation.neuron_fees_e8s;
    return cached_neuron_stake_e8s + maturity_e8s_equivalent + staked_maturity_e8s_equivalent_value - neuron_fees_e8s;
};

const getNeuron = (neuronAsset: NeuronAsset | undefined): Neuron | undefined => {
    if (isNullish(neuronAsset)) {
        return undefined;
    }
    const timestamped = fromNullable(neuronAsset.info);
    if (isNullish(timestamped)) {
        return undefined;
    }
    const timestampMillis = timestamped.timestamp;
    const neuronInformation: NeuronInformation = timestamped.value;
    const neuronInformationExtended = fromNullable(neuronInformation.neuron_information_extended);
    if (isNullish(neuronInformationExtended)) {
        return undefined;
    }
    const neuronId = neuronAsset.neuron_id;
    const totalStakeUlps = getNeuronTotalStakeUlps(neuronInformation);
    return {
        neuronId,
        timestampMillis,
        totalStakeUlps,
        state: neuronInformationExtended.state,
        ageSeconds: neuronInformationExtended.age_seconds,
        dissolveDelaySeconds: neuronInformationExtended.dissolve_delay_seconds,
        __rawNeuronInformation: neuronInformation
    };
};

const calculateWeightedAverage = (neurons: Array<Neuron>, neuronsTotalStakeUlps: bigint, valueSupplier: (neuron: Neuron) => bigint): bigint | undefined => {
    if (neurons.length == 0) {
        return undefined;
    }
    let totalWeightedValue = 0n;
    neurons.forEach((neuron, _index) => {
        const value = valueSupplier(neuron);
        totalWeightedValue += value * neuron.totalStakeUlps;
    });
    if (neuronsTotalStakeUlps == 0n) {
        return undefined;
    }
    return totalWeightedValue / neuronsTotalStakeUlps;
};

const getNeuronsWeightedAverageAge = (neurons: Array<Neuron>, neuronsTotalStakeUlps: bigint): bigint | undefined => {
    return calculateWeightedAverage(neurons, neuronsTotalStakeUlps, (neuron) => neuron.ageSeconds);
};

const getNeuronsWeightedAverageDissolveDelay = (neurons: Array<Neuron>, neuronsTotalStakeUlps: bigint): bigint | undefined => {
    return calculateWeightedAverage(neurons, neuronsTotalStakeUlps, (neuron) => neuron.dissolveDelaySeconds);
};

const getControlledNeurons = (controlledNeurons: HolderAssets['controlled_neurons']): {type: 'noNeurons'} | {type: 'invalidNeurons'} | {type: 'validNeurons'; neurons: Neurons} => {
    const neuronAssets: Array<NeuronAsset> | undefined = fromNullable(controlledNeurons)?.value;

    if (isNullish(neuronAssets)) {
        return {type: 'invalidNeurons'};
    }
    if (neuronAssets.length == 0) {
        return {type: 'noNeurons'};
    }
    const neurons: Array<Neuron> = compactArray(neuronAssets.map(getNeuron));
    if (neurons.length == 0) {
        return {type: 'invalidNeurons'};
    }

    const totalStakeUlps = neurons.reduce((acc, neuron) => acc + neuron.totalStakeUlps, 0n);
    const weightedAverageNeuronAge = getNeuronsWeightedAverageAge(neurons, totalStakeUlps);
    const weightedAverageDissolveDelay = getNeuronsWeightedAverageDissolveDelay(neurons, totalStakeUlps);
    const earliestTimestampMillis = neurons.map((n) => n.timestampMillis).reduce((a, b) => (a < b ? a : b));
    return {
        type: 'validNeurons',
        neurons: {
            totalStakeUlps,
            weightedAverageNeuronAge,
            weightedAverageDissolveDelay,
            neurons,
            earliestTimestampMillis
        }
    };
};
