import {isNullish} from '@dfinity/utils';
import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import type {ExtractValidStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {trimIfDefined} from 'frontend/src/utils/core/string/string';
import {createContext, type Dispatch, type PropsWithChildren, useContext, useMemo} from 'react';
import {extractRegistrationId} from './registrationIdUtils';

type FormState = {
    pairURL?: string;
};

type PairURLValidationStatus = ValidationStatus<{registrationId: string}, InputFormItemState>;
type FormValidationState = {
    pairURL?: PairURLValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<PairURLValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderWaitingStartCaptureFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderWaitingStartCaptureFormDataContext must be used within a IdentityHolderWaitingStartCaptureFormDataProvider');
    }
    return context;
};

export const IdentityHolderWaitingStartCaptureFormDataProvider = (props: PropsWithChildren) => {
    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedPairURL = validatePairURL(formState.pairURL);
        const formValidationState: FormValidationState = {
            pairURL: validatedPairURL
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedPairURL.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      registrationId: validatedPairURL.registrationId
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.pairURL]);

    const value = useMemo<Context>(() => {
        return {
            formState,
            updateFormState,
            formValidationState,
            formDataAvailability
        };
    }, [formState, updateFormState, formValidationState, formDataAvailability]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};

const validatePairURL = (raw: string | undefined): PairURLValidationStatus => {
    const input = trimIfDefined(raw);
    if (isNullish(input)) {
        return {type: 'invalid'};
    }

    const registrationId = extractRegistrationId(input);
    if (isNullish(registrationId)) {
        return {
            type: 'invalid',
            status: 'error',
            error: i18.common.error.inputInvalidURL
        };
    }

    return {
        type: 'valid',
        registrationId
    };
};
