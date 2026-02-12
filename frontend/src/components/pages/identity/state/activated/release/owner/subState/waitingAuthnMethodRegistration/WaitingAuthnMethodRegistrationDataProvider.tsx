import {nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useConfirmOwnerAuthnMethodRegistration} from 'frontend/src/context/identityHolder/state/release/useConfirmOwnerAuthnMethodRegistration';
import {useOwnerCanConfirmOwnerAuthnMethodRegistration} from 'frontend/src/context/identityHolder/state/release/useOwnerCanConfirmOwnerAuthnMethodRegistration';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {ConfirmAuthnMethodRegistrationErrorPanel} from '../../../../common/processingError/backend/confirmAuthnMethodRegistrationError/ConfirmAuthnMethodRegistrationErrorPanel';
import {useWaitingAuthnMethodRegistrationFormDataContext} from './WaitingAuthnMethodRegistrationFormDataProvider';
import {useWaitingAuthnMethodRegistrationRemainingTimerActive} from './useWaitingAuthnMethodRegistrationRemainingTimerActive';

type ActionAvailability = DataAvailability<{
    verificationCode: string;
}>;

type Context = {
    timerActive: boolean;
    expirationTimeMillis: bigint | undefined;

    buttonProps: ButtonProps;

    actionInProgress: boolean;
    actionErrorPanel: ReactNode;

    formControlsDisabled: boolean;

    actionAvailability: ActionAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useWaitingAuthnMethodRegistrationDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useWaitingAuthnMethodRegistrationDataContext must be used within a WaitingAuthnMethodRegistrationDataProvider');
    }
    return context;
};

export const WaitingAuthnMethodRegistrationDataProvider = (props: PropsWithChildren) => {
    const {formDataAvailability} = useWaitingAuthnMethodRegistrationFormDataContext();
    const timerActive = useWaitingAuthnMethodRegistrationRemainingTimerActive();

    const {getSubStateValue} = useIdentityHolderStateContext();
    const releaseSubState = useMemo(() => getSubStateValue('Release', 'WaitingAuthnMethodRegistration'), [getSubStateValue]);

    const expirationTimeMillis = releaseSubState?.expiration;

    const {confirmOwnerAuthnMethodRegistration, feature, responseError} = useConfirmOwnerAuthnMethodRegistration();
    const actionInProgress = feature.status.inProgress;
    const ownerCanConfirmOwnerAuthnMethodRegistration = useOwnerCanConfirmOwnerAuthnMethodRegistration();

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (!ownerCanConfirmOwnerAuthnMethodRegistration) {
            return {type: 'notAvailable'};
        }
        if (formDataAvailability.type != 'available') {
            return {type: 'notAvailable'};
        }
        return {
            type: 'available',
            verificationCode: formDataAvailability.verificationCode
        };
    }, [formDataAvailability, ownerCanConfirmOwnerAuthnMethodRegistration]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        await confirmOwnerAuthnMethodRegistration({
            verification_code: actionAvailability.verificationCode
        });
    }, [actionAvailability, confirmOwnerAuthnMethodRegistration]);

    const buttonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.holder.state.release.waitingAuthnMethodRegistration.button;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = performAction;
        return result;
    }, [actionAvailability.type, actionInProgress, performAction]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        const messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
        return <ConfirmAuthnMethodRegistrationErrorPanel />;
    }, [feature.error, responseError]);

    const formControlsDisabled = actionInProgress;

    const value = useMemo<Context>(() => {
        return {
            timerActive,
            expirationTimeMillis,

            buttonProps,

            actionInProgress,
            actionErrorPanel,

            formControlsDisabled,

            actionAvailability
        };
    }, [timerActive, expirationTimeMillis, buttonProps, actionInProgress, actionErrorPanel, formControlsDisabled, actionAvailability]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
