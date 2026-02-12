import {isNullish, nonNullish} from '@dfinity/utils';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {useIdentityHolderSaleStatus, type CurrentUserRole} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useDynamicTick} from 'frontend/src/hook/useDynamicTick';
import {i18} from 'frontend/src/i18';
import {getDurationTillUTCMillisUnsafe} from 'frontend/src/utils/core/date/duration';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {useMemo, type ReactNode} from 'react';

type Status =
    | {
          type: 'notListed';
      }
    | {
          type: 'listed';
          price: bigint;
      };

type Panel = {
    role: CurrentUserRole;
    quarantineEndTimeMillis: number | undefined;

    status: Status;
};

export const CooldownStatusPanel = () => {
    const saleStatus = useIdentityHolderSaleStatus();

    const panel = useMemo<Panel | undefined>(() => {
        if (saleStatus.type == 'noData' || saleStatus.type == 'sold') {
            return undefined;
        }

        const status: Status = saleStatus.type == 'listed' ? {type: 'listed', price: saleStatus.price} : {type: 'notListed'};

        return {
            role: saleStatus.currentUserRole,
            quarantineEndTimeMillis: saleStatus.quarantineEndTimeMillis,
            status
        };
    }, [saleStatus]);

    if (isNullish(panel)) {
        return null;
    }

    return <Content panel={panel} />;
};

type ContentProps = {panel: Panel};

const Content = ({panel}: ContentProps) => {
    switch (panel.role) {
        case 'owner':
            return <OwnerContent panel={panel} />;
        case 'buyer':
            // illegal state - we should not reach here because as soon as deal is accepted, there is "processing" stub shown, then "completed sale deal" data.
            return null;
        case 'guest':
            return <GuestContent panel={panel} />;
        default: {
            const exhaustiveCheck: never = panel.role;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return null;
        }
    }
};

const OwnerContent = ({panel}: ContentProps) => {
    const message = useMemo(() => {
        const type = panel.status.type;
        switch (type) {
            case 'notListed': {
                if (nonNullish(panel.quarantineEndTimeMillis)) {
                    return i18.holder.state.holding.common.topPanel.cooldown.owner.cooldownWithoutPrice(<CooldownComponent quarantineEndTimeMillis={panel.quarantineEndTimeMillis} />);
                }
                return i18.holder.state.holding.common.topPanel.cooldown.owner.withoutPrice;
            }
            case 'listed':
                if (nonNullish(panel.quarantineEndTimeMillis)) {
                    return i18.holder.state.holding.common.topPanel.cooldown.owner.cooldownWithPrice(<CooldownComponent quarantineEndTimeMillis={panel.quarantineEndTimeMillis} />);
                }
                return null;
            default: {
                const exhaustiveCheck: never = type;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [panel.status.type, panel.quarantineEndTimeMillis]);

    if (isNullish(message)) {
        return null;
    }

    return <WarningAlert message={message} />;
};

const GuestContent = ({panel}: ContentProps) => {
    const message = useMemo<ReactNode>(() => {
        const type = panel.status.type;
        switch (type) {
            case 'notListed':
                if (nonNullish(panel.quarantineEndTimeMillis)) {
                    return i18.holder.state.holding.common.topPanel.cooldown.guest.cooldownWithoutPrice(<CooldownComponent quarantineEndTimeMillis={panel.quarantineEndTimeMillis} />);
                }
                return i18.holder.state.holding.common.topPanel.cooldown.guest.withoutPrice;
            case 'listed':
                if (nonNullish(panel.quarantineEndTimeMillis)) {
                    return i18.holder.state.holding.common.topPanel.cooldown.guest.cooldownWithPrice(<CooldownComponent quarantineEndTimeMillis={panel.quarantineEndTimeMillis} />);
                }
                return null;
            default: {
                const exhaustiveCheck: never = type;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [panel.status.type, panel.quarantineEndTimeMillis]);

    if (isNullish(message)) {
        return null;
    }

    return <WarningAlert message={message} />;
};

const CooldownComponent = ({quarantineEndTimeMillis}: {quarantineEndTimeMillis: number | undefined}) => {
    const tick = useDynamicTick(quarantineEndTimeMillis);
    if (isNullish(quarantineEndTimeMillis)) {
        return null;
    }
    return <Label key={tick} quarantineEndTimeMillis={quarantineEndTimeMillis} />;
};

const Label = (props: {quarantineEndTimeMillis: number}) => {
    const {quarantineEndTimeMillis} = props;

    const label = useMemo(() => {
        const durationMillis = getDurationTillUTCMillisUnsafe(quarantineEndTimeMillis);
        const durationLabel = formatDuration(durationMillis);
        if (nonNullish(durationLabel)) {
            return i18.holder.state.holding.common.topPanel.cooldown.cooldownDurationLabel(durationLabel);
        }
        return i18.holder.state.holding.common.topPanel.cooldown.cooldownActiveSoon;
    }, [quarantineEndTimeMillis]);

    return <span className="gf-strong">{label}</span>;
};
