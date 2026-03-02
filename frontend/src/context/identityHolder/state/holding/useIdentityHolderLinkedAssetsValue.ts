import {type Principal} from '@dfinity/principal';
import {fromNullable, fromNullishNullable, isNullish} from '@dfinity/utils';
import {compactArray, isEmptyArray} from 'frontend/src/utils/core/array/array';
import {getAccountIdentifierHexFromByteArraySafe} from 'frontend/src/utils/ic/account';
import {useCallback, useMemo} from 'react';

import {applicationLogger} from 'frontend/src/context/logger/logger';
import type {AccountInformation, AccountsInformation, HolderAssets, NeuronAsset, NeuronInformation, NnsHolderAssets, SubAccountInformation} from 'src/declarations/contract/contract.did';
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

// Data for one identity account slot
export type IdentityAccountAssets = {
    identityAccountNumber: bigint | undefined;
    principal: Principal;
    accounts: Accounts | undefined;
    neurons: Neurons | undefined;
    totalValueUlps: bigint;
    numberOfAccounts: number;
    numberOfNeurons: number;
    earliestTimestampMillis: bigint | undefined;
};

type ContextValidAssets = {
    type: 'assets';

    // Per-identity-account data, indexed by slot order
    identityAccounts: Array<IdentityAccountAssets>;

    // Flat list for AccountList UI (all accounts from all slots in slot order)
    allAccounts: Array<MainAccount | SubAccount>;

    // Aggregated neurons across all slots (unique neuron_ids verified), for NeuronList + stats
    neurons: Neurons | undefined;

    // Aggregated totals
    totalValueUlps: bigint;
    earliestTimestampMillis: bigint | undefined;
    numberOfAccounts: number;
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

        const slots = fromNullable(assets.nns_assets) ?? [];

        // nns_assets present but empty = no identity accounts = noAssets
        if (slots.length === 0) {
            return {type: 'noAssets'};
        }

        // Parse every slot; bail immediately on any failure
        const parsedSlots: Array<IdentityAccountAssets> = [];
        for (const slot of slots) {
            const nnsAssets = fromNullishNullable(slot.assets);

            // slot.assets = None in completed holder assets → data is missing → invalidAssets
            if (isNullish(nnsAssets)) {
                applicationLogger.log('slot.assets is null in completed holder assets', {slot});
                return {type: 'invalidAssets'};
            }

            // principal must always be present after successful fetch
            const principal = fromNullishNullable(slot.principal);
            if (isNullish(principal)) {
                applicationLogger.log('slot.principal is null in completed holder assets', {slot});
                return {type: 'invalidAssets'};
            }

            const parsedAccounts = getAccounts(nnsAssets.accounts);
            if (parsedAccounts.type === 'invalidAccounts') {
                applicationLogger.log('Failed to parse accounts for slot', {slot});
                return {type: 'invalidAssets'};
            }

            const parsedNeurons = getControlledNeurons(nnsAssets.controlled_neurons);
            if (parsedNeurons.type === 'invalidNeurons') {
                applicationLogger.log('Failed to parse neurons for slot', {slot});
                return {type: 'invalidAssets'};
            }

            const accounts: Accounts | undefined = parsedAccounts.type === 'validAccounts' ? parsedAccounts.accounts : undefined;
            const neurons: Neurons | undefined = parsedNeurons.type === 'validNeurons' ? parsedNeurons.neurons : undefined;

            const accountsValue = accounts?.totalValueUlps ?? 0n;
            const neuronsValue = neurons?.totalStakeUlps ?? 0n;
            const totalValueUlps = accountsValue + neuronsValue;
            const numberOfAccounts = isNullish(accounts) ? 0 : accounts.subAccounts.length + 1;
            const numberOfNeurons = neurons?.neurons.length ?? 0;
            const tsArray = compactArray([accounts?.earliestTimestampMillis, neurons?.earliestTimestampMillis]);
            const earliestTimestampMillis = isEmptyArray(tsArray) ? undefined : tsArray.reduce((a, b) => (a < b ? a : b));

            parsedSlots.push({
                identityAccountNumber: fromNullable(slot.identity_account_number),
                principal,
                accounts,
                neurons,
                totalValueUlps,
                numberOfAccounts,
                numberOfNeurons,
                earliestTimestampMillis
            });
        }

        // If every slot has no accounts AND no neurons → noAssets
        const hasAnyData = parsedSlots.some((s) => s.numberOfAccounts > 0 || s.numberOfNeurons > 0);
        if (!hasAnyData) {
            return {type: 'noAssets'};
        }

        // Build flat allAccounts (main + sub from each slot in order)
        const allAccounts: Array<MainAccount | SubAccount> = parsedSlots.flatMap((s) => {
            if (isNullish(s.accounts)) {
                return [];
            }
            return [s.accounts.mainAccount, ...s.accounts.subAccounts];
        });

        // Validate no neuron_id appears in more than one slot — by spec this must never happen
        const allNeuronsList = parsedSlots.flatMap((s) => s.neurons?.neurons ?? []);
        const neuronIdSet = new Set<bigint>();
        for (const neuron of allNeuronsList) {
            if (neuronIdSet.has(neuron.neuronId)) {
                applicationLogger.log('Duplicate neuron_id across identity account slots', {neuronId: neuron.neuronId});
                return {type: 'invalidAssets'};
            }
            neuronIdSet.add(neuron.neuronId);
        }

        const neurons: Neurons | undefined = allNeuronsList.length > 0 ? buildAggregatedNeurons(allNeuronsList) : undefined;

        const totalValueUlps = parsedSlots.reduce((sum, s) => sum + s.totalValueUlps, 0n);
        const numberOfAccounts = parsedSlots.reduce((sum, s) => sum + s.numberOfAccounts, 0);
        const numberOfNeurons = allNeuronsList.length;

        const allTs = compactArray(parsedSlots.map((s) => s.earliestTimestampMillis));
        const earliestTimestampMillis = isEmptyArray(allTs) ? undefined : allTs.reduce((a, b) => (a < b ? a : b));

        return {
            type: 'assets',
            identityAccounts: parsedSlots,
            allAccounts,
            neurons,
            totalValueUlps,
            earliestTimestampMillis,
            numberOfAccounts,
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

const getAccounts = (accounts: NnsHolderAssets['accounts']): {type: 'noAccounts'} | {type: 'invalidAccounts'} | {type: 'validAccounts'; accounts: Accounts} => {
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
const buildAggregatedNeurons = (neurons: Array<Neuron>): Neurons => {
    const totalStakeUlps = neurons.reduce((acc, n) => acc + n.totalStakeUlps, 0n);
    const weightedAverageNeuronAge = getNeuronsWeightedAverageAge(neurons, totalStakeUlps);
    const weightedAverageDissolveDelay = getNeuronsWeightedAverageDissolveDelay(neurons, totalStakeUlps);
    const earliestTimestampMillis = neurons.map((n) => n.timestampMillis).reduce((a, b) => (a < b ? a : b));
    return {totalStakeUlps, weightedAverageNeuronAge, weightedAverageDissolveDelay, neurons, earliestTimestampMillis};
};
const getControlledNeurons = (controlledNeurons: NnsHolderAssets['controlled_neurons']): {type: 'noNeurons'} | {type: 'invalidNeurons'} | {type: 'validNeurons'; neurons: Neurons} => {
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
