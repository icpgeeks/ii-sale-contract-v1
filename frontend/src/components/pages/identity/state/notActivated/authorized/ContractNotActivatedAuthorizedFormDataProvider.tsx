import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {type ExtractValidStatus, validateRequiredString, type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {createContext, type Dispatch, type PropsWithChildren, useContext, useMemo} from 'react';

type FormState = {
    activationCode?: string;
};

type ActivationCodeValidationStatus = ValidationStatus<{activationCode: string}, InputFormItemState>;
type FormValidationState = {
    activationCode?: ActivationCodeValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<ActivationCodeValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useContractNotActivatedAuthorizedFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useContractNotActivatedAuthorizedFormDataContext must be used within a ContractNotActivatedAuthorizedFormDataProvider');
    }
    return context;
};

export const ContractNotActivatedAuthorizedFormDataProvider = (props: PropsWithChildren) => {
    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedActivationCode = validateActivationCode(formState.activationCode);
        const formValidationState: FormValidationState = {
            activationCode: validatedActivationCode
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedActivationCode.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      activationCode: validatedActivationCode.activationCode
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.activationCode]);

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

const validateActivationCode = (raw: string | undefined): ActivationCodeValidationStatus => {
    const result = validateRequiredString(raw);
    if (result.type == 'invalid') {
        return result;
    }
    return {
        type: result.type,
        activationCode: result.value
    };
};
