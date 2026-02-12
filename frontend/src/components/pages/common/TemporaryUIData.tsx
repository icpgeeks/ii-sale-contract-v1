import {nonNullish} from '@dfinity/utils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {KeyValueStoreFacade} from 'frontend/src/utils/store/KeyValueStore';
import {useEffect} from 'react';

const store = KeyValueStoreFacade.createStore('tmp-ui-');
const CAPTURE_REGISTRATION_ID_KEY = 'regId';
const CAPTURE_ACTIVATION_CODE_KEY = 'capActCode';

export const TemporaryUIData = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const captureSubStateType = getStateUnion('Capture')?.type;

    const shouldRemoveCaptureRegistrationId =
        nonNullish(captureSubStateType) && captureSubStateType != 'StartCapture' && captureSubStateType != 'CreateEcdsaKey' && captureSubStateType != 'RegisterAuthnMethodSession';
    const shouldRemoveCaptureActivationCode = nonNullish(captureSubStateType) && captureSubStateType != 'ExitAndRegisterHolderAuthnMethod';

    useEffect(() => {
        if (shouldRemoveCaptureRegistrationId) {
            store.remove(CAPTURE_REGISTRATION_ID_KEY);
        }
    }, [shouldRemoveCaptureRegistrationId]);

    useEffect(() => {
        if (shouldRemoveCaptureActivationCode) {
            store.remove(CAPTURE_ACTIVATION_CODE_KEY);
        }
    }, [shouldRemoveCaptureActivationCode]);

    return null;
};

export const getStoredCaptureRegistrationId = (): string | undefined => {
    return store.get(CAPTURE_REGISTRATION_ID_KEY);
};

export const storeCaptureRegistrationId = (registrationId: string) => {
    store.set(CAPTURE_REGISTRATION_ID_KEY, registrationId);
};

export const getStoredCaptureActivationCode = (): string | undefined => {
    return store.get(CAPTURE_ACTIVATION_CODE_KEY);
};

export const storeCaptureActivationCode = (activationCode: string) => {
    store.set(CAPTURE_ACTIVATION_CODE_KEY, activationCode);
};
