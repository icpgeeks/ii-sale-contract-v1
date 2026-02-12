import {fromNullable, ICPToken, isNullish} from '@dfinity/utils';
import {Flex, Modal, Typography} from 'antd';
import {KeyValueRow} from 'frontend/src/components/widgets/KeyValueRow';
import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {CopyableUIDComponent} from 'frontend/src/components/widgets/uid/CopyableUIDComponent';
import {MODAL_WIDTH} from 'frontend/src/constants';
import {i18} from 'frontend/src/i18';
import {formatDateAgo, formatDateTime} from 'frontend/src/utils/core/date/format';
import {formatAtomicAmountRounded} from 'frontend/src/utils/core/number/atomic/atomic';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {NeuronType, NeuronVisibility} from 'frontend/src/utils/ic/nns/governance.enums';
import {useCallback, useMemo, type ReactNode} from 'react';
import type {ItemType} from '../NeuronList';
import {StateComponent} from '../StateComponent';
import {getNeuronAccountIdentifier, getNeuronAgeFormatted, getNeuronDissolveDelayFormatted} from '../neuronUtils';

const UNSPECIFIED = i18.holder.state.holding.common.neurons.modal.common.unspecified;
const NON_APPLICABLE = i18.holder.state.holding.common.neurons.modal.common.nonApplicable;

type Props = {
    record: ItemType;
};
export const NeuronInfoModalRenderer = ({record}: Props) => {
    const [modal, modalContextHolder] = Modal.useModal();

    const onClick = useCallback(() => {
        modal.success({
            icon: null,
            content: <Content record={record} />,
            okText: i18.common.button.closeButton,
            okType: 'default',
            okButtonProps: {className: 'gf-width-100'},
            autoFocusButton: null,
            width: MODAL_WIDTH,
            closable: !false,
            maskClosable: false,
            keyboard: false,
            centered: true
        });
    }, [modal, record]);

    return (
        <>
            {modalContextHolder}
            <div>
                <LinkButton onClick={onClick} className="gf-underline gf-no-padding gf-font-size-smaller">
                    {i18.holder.state.holding.common.neurons.viewDetails}
                </LinkButton>
            </div>
        </>
    );
};

const Content = ({record}: {record: ItemType}) => {
    const {__rawNeuronInformation: neuronInformation} = record;
    const staked_maturity_e8s_equivalent_value = fromNullable(neuronInformation.staked_maturity_e8s_equivalent) ?? 0n;
    return (
        <Flex vertical gap={16}>
            <div>
                <Typography.Title level={4}>{i18.holder.state.holding.common.neurons.modal.title(record.neuronId.toString())}</Typography.Title>
                <div className="gf-ant-color-secondary gf-font-size-smaller">{i18.holder.state.holding.common.neurons.modal.lastUpdated(formatDateAgo(Number(record.timestampMillis)))}</div>
            </div>
            <Flex vertical gap={24}>
                <Flex vertical gap={8}>
                    <Created record={record} />
                    <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.neuronState} value={<StateComponent record={record} />} />
                    <DissolveDelay record={record} />
                    <Age record={record} />
                    <AgingSince record={record} />
                </Flex>
                <Flex vertical gap={8}>
                    <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.total} value={formatTokenAmountWithSymbol(record.totalStakeUlps, ICPToken)} />
                    <DynamicKeyValueRow
                        label={i18.holder.state.holding.common.neurons.modal.cachedNeuronStake}
                        value={formatTokenAmountWithSymbol(neuronInformation.cached_neuron_stake_e8s, ICPToken)}
                    />
                    <DynamicKeyValueRow
                        label={i18.holder.state.holding.common.neurons.modal.stakedMaturityEquivalent}
                        value={formatTokenAmountWithSymbol(staked_maturity_e8s_equivalent_value, ICPToken)}
                    />
                    <DynamicKeyValueRow
                        label={i18.holder.state.holding.common.neurons.modal.maturityEquivalent}
                        value={formatTokenAmountWithSymbol(neuronInformation.maturity_e8s_equivalent, ICPToken)}
                    />
                    <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.neuronFees} value={formatTokenAmountWithSymbol(neuronInformation.neuron_fees_e8s, ICPToken)} />
                    <AutoStakeMaturity record={record} />
                </Flex>
                <Flex vertical gap={8}>
                    <PotentialVotingPower record={record} />
                    <DecidingVotingPower record={record} />
                    <VotingPowerRefreshedAt record={record} />
                </Flex>
                <Flex vertical gap={8}>
                    <NeuronTypeComponent record={record} />
                    <BooleanKeyValueRow label={i18.holder.state.holding.common.neurons.modal.kycVerified} value={neuronInformation.kyc_verified} />
                    <BooleanKeyValueRow label={i18.holder.state.holding.common.neurons.modal.nonForProfit} value={neuronInformation.not_for_profit} />
                    <KnownNeuronName record={record} />
                    <JoinedCommunityFund record={record} />
                    <Visibility record={record} />
                </Flex>
                <Flex vertical gap={8}>
                    <Controller record={record} />
                    <Account record={record} />
                </Flex>
            </Flex>
            {/* space above the footer */}
            <div></div>
        </Flex>
    );
};

const Created = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {created_timestamp_seconds}
    } = record;
    const value = useMemo(() => formatDateTime(Number(created_timestamp_seconds) * 1000), [created_timestamp_seconds]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.created} value={value ?? UNSPECIFIED} />;
};

const DissolveDelay = ({record}: {record: ItemType}) => {
    const {state, dissolveDelaySeconds} = record;
    const [label, value] = useMemo(() => {
        const value = getNeuronDissolveDelayFormatted(state, dissolveDelaySeconds);
        if (isNullish(value)) {
            return [undefined, undefined];
        }
        return [value.type == 'dissolveDelay' ? i18.holder.state.holding.common.neurons.modal.dissolveDelay : i18.holder.state.holding.common.neurons.modal.remaining, value.value];
    }, [dissolveDelaySeconds, state]);
    if (isNullish(value)) {
        return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.dissolveDelay} value={NON_APPLICABLE} />;
    }
    return <DynamicKeyValueRow label={label} value={value} />;
};

const Age = ({record}: {record: ItemType}) => {
    const {state, ageSeconds} = record;
    const value = useMemo(() => getNeuronAgeFormatted(state, ageSeconds), [ageSeconds, state]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.age} value={value ?? NON_APPLICABLE} />;
};

const AgingSince = ({record}: {record: ItemType}) => {
    const {state, ageSeconds} = record;
    const ageValue = useMemo(() => getNeuronAgeFormatted(state, ageSeconds), [ageSeconds, state]);
    const value = isNullish(ageValue) ? NON_APPLICABLE : formatDateTime(Number(record.__rawNeuronInformation.aging_since_timestamp_seconds) * 1000);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.agingSince} value={value} />;
};

const AutoStakeMaturity = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {auto_stake_maturity}
    } = record;
    const value = useMemo(() => {
        const v = fromNullable(auto_stake_maturity);
        if (isNullish(v)) {
            return undefined;
        }
        return v == true;
    }, [auto_stake_maturity]);
    return <BooleanKeyValueRow label={i18.holder.state.holding.common.neurons.modal.autoStakeMaturity} value={value} />;
};

const PotentialVotingPower = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {potential_voting_power}
    } = record;
    const pvp = fromNullable(potential_voting_power);
    const value = useMemo(() => formatAtomicAmountRounded(pvp) ?? UNSPECIFIED, [pvp]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.potentialVotingPower} value={value} />;
};

const DecidingVotingPower = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {deciding_voting_power}
    } = record;
    const dvp = fromNullable(deciding_voting_power);
    const value = useMemo(() => formatAtomicAmountRounded(dvp) ?? UNSPECIFIED, [dvp]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.decidingVotingPower} value={value} />;
};

const VotingPowerRefreshedAt = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {voting_power_refreshed_timestamp_seconds}
    } = record;
    const timestamp = fromNullable(voting_power_refreshed_timestamp_seconds);
    const value = useMemo(() => {
        if (isNullish(timestamp)) {
            return UNSPECIFIED;
        }
        return formatDateTime(Number(timestamp) * 1000);
    }, [timestamp]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.votingPowerRefreshedAt} value={value} />;
};

const NeuronTypeComponent = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {neuron_type}
    } = record;
    const value = useMemo(() => {
        const v = fromNullable(neuron_type);
        if (v == NeuronType.Unspecified) {
            return undefined;
        }
        if (v == NeuronType.Ect) {
            return i18.holder.state.holding.common.neurons.modal.neuronType.ect;
        }
        if (v == NeuronType.Seed) {
            return i18.holder.state.holding.common.neurons.modal.neuronType.seed;
        }
        return undefined;
    }, [neuron_type]);

    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.neuronType.title} value={value ?? UNSPECIFIED} />;
};

const KnownNeuronName = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {known_neuron_name}
    } = record;
    const knownNeuronName = fromNullable(known_neuron_name);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.knownNeuronName} value={knownNeuronName ?? UNSPECIFIED} />;
};

const JoinedCommunityFund = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {joined_community_fund_timestamp_seconds}
    } = record;
    const value = useMemo(() => {
        const v = fromNullable(joined_community_fund_timestamp_seconds);
        if (isNullish(v)) {
            return UNSPECIFIED;
        }
        return formatDateTime(Number(v) * 1000);
    }, [joined_community_fund_timestamp_seconds]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.joinedCommunityFund} value={value} />;
};

const Visibility = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {visibility}
    } = record;
    const value = useMemo(() => {
        const v = fromNullable(visibility);
        if (v == NeuronVisibility.Private) {
            return i18.holder.state.holding.common.neurons.modal.visibility.private;
        }
        if (v == NeuronVisibility.Public) {
            return i18.holder.state.holding.common.neurons.modal.visibility.public;
        }
        return i18.holder.state.holding.common.neurons.modal.visibility.unspecified;
    }, [visibility]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.visibility.title} value={value} />;
};

const Controller = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {controller}
    } = record;
    const value = useMemo(() => {
        const v = fromNullable(controller);
        if (isNullish(v)) {
            return UNSPECIFIED;
        }
        return <CopyableUIDComponent uid={v.toText()} />;
    }, [controller]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.controller} value={value} vertical valueClassName="gf-ta-left" />;
};

const Account = ({record}: {record: ItemType}) => {
    const {
        __rawNeuronInformation: {account}
    } = record;
    const value = useMemo(() => {
        const v = getNeuronAccountIdentifier(account);
        if (isNullish(v)) {
            return UNSPECIFIED;
        }
        return <CopyableUIDComponent uid={v} />;
    }, [account]);
    return <DynamicKeyValueRow label={i18.holder.state.holding.common.neurons.modal.account} value={value} vertical valueClassName="gf-ta-left" />;
};

const DynamicKeyValueRow = ({label, value, vertical, valueClassName = 'gf-ta-right gf-breakWord'}: {label: ReactNode; value: ReactNode; vertical?: boolean; valueClassName?: string}) => {
    return <KeyValueRow gap={vertical ? 0 : 8} vertical={vertical} justify="space-between" label={label} value={value} valueClassName={valueClassName} />;
};

const BooleanKeyValueRow = ({label, value}: {label: ReactNode; value: boolean | undefined}) => {
    const value_ = isNullish(value) ? UNSPECIFIED : value ? i18.common.yes : i18.common.no;
    return <KeyValueRow gap={8} justify="space-between" label={label} value={value_} valueClassName="gf-ta-right gf-breakWord" />;
};
