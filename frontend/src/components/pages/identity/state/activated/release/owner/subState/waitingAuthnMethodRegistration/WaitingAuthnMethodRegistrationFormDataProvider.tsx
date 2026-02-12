import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {type ExtractValidStatus, validateRequiredString, type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {createContext, type Dispatch, type PropsWithChildren, useContext, useMemo} from 'react';

type FormState = {
    verificationCode?: string;
};

type VerificationCodeValidationStatus = ValidationStatus<{verificationCode: string}, InputFormItemState>;
type FormValidationState = {
    verificationCode?: VerificationCodeValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<VerificationCodeValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useWaitingAuthnMethodRegistrationFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useWaitingAuthnMethodRegistrationFormDataContext must be used within a WaitingAuthnMethodRegistrationFormDataProvider');
    }
    return context;
};

export const WaitingAuthnMethodRegistrationFormDataProvider = (props: PropsWithChildren) => {
    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedVerificationCode = validateVerificationCode(formState.verificationCode);
        const formValidationState: FormValidationState = {
            verificationCode: validatedVerificationCode
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedVerificationCode.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      verificationCode: validatedVerificationCode.verificationCode
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.verificationCode]);

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

const validateVerificationCode = (raw: string | undefined): VerificationCodeValidationStatus => {
    const result = validateRequiredString(raw);
    if (result.type == 'invalid') {
        return result;
    }
    return {
        type: result.type,
        verificationCode: result.value
    };
};
