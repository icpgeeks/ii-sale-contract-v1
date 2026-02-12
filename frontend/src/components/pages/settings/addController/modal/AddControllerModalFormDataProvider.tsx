import type {ExtractValidStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import type {PrincipalValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/principalValidator';
import {validatePrincipal} from 'frontend/src/components/widgets/form/inputFormItem/principalValidator';
import {useSimpleReducer, type DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {createContext, useContext, useMemo, type Dispatch, type PropsWithChildren} from 'react';

type FormState = {
    principal?: string;
};

type FormValidationState = {
    principal?: PrincipalValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<PrincipalValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useAddControllerModalFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useAddControllerModalFormDataContext must be used within a AddControllerModalFormDataProvider');
    }
    return context;
};

export const AddControllerModalFormDataProvider = (props: PropsWithChildren) => {
    /**
    ==========================================
    Form State
    ==========================================
    */

    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    /**
    ==========================================
    Form Data Validation/Availability
    ==========================================
    */

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedPrincipal = validatePrincipal(formState.principal);
        const formValidationState: FormValidationState = {
            principal: validatedPrincipal
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedPrincipal.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      principal: validatedPrincipal.principal
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.principal]);

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
