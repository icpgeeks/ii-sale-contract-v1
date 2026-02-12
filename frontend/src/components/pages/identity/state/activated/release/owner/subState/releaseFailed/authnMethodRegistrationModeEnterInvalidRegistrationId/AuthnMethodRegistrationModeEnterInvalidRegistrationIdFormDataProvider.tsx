import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {type ExtractValidStatus, validateRequiredString, type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {createContext, type Dispatch, type PropsWithChildren, useContext, useMemo} from 'react';

type FormState = {
    registrationId?: string;
};

type RegistrationIdValidationStatus = ValidationStatus<{registrationId: string}, InputFormItemState>;
type FormValidationState = {
    registrationId?: RegistrationIdValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<RegistrationIdValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext must be used within a AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider');
    }
    return context;
};

export const AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider = (props: PropsWithChildren) => {
    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedRegistrationId = validateRegistrationId(formState.registrationId);
        const formValidationState: FormValidationState = {
            registrationId: validatedRegistrationId
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedRegistrationId.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      registrationId: validatedRegistrationId.registrationId
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.registrationId]);

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

const validateRegistrationId = (raw: string | undefined): RegistrationIdValidationStatus => {
    const result = validateRequiredString(raw);
    if (result.type == 'invalid') {
        return result;
    }
    return {
        type: result.type,
        registrationId: result.value
    };
};
