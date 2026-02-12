import {type AccountVariantValidationStatus, validateAccountVariant} from 'frontend/src/components/widgets/form/inputFormItem/accountVariantValidator';
import type {ExtractValidStatus, ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {createContext, type Dispatch, type PropsWithChildren, useContext, useMemo} from 'react';

type FormState = {
    accountVariant?: string;
    userAgreementChecked?: boolean;
};

type UserAgreementCheckedValidationStatus = ValidationStatus<{userAgreementChecked: boolean}>;
type FormValidationState = {
    accountVariant?: AccountVariantValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<AccountVariantValidationStatus> & ExtractValidStatus<UserAgreementCheckedValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetSaleIntentionModalFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetSaleIntentionModalFormDataContext must be used within a SetSaleIntentionModalFormDataProvider');
    }
    return context;
};

export const SetSaleIntentionModalFormDataProvider = (props: PropsWithChildren) => {
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
        const validatedAccountVariant = validateAccountVariant(formState.accountVariant);
        const formValidationState: FormValidationState = {
            accountVariant: validatedAccountVariant
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedAccountVariant.type == 'invalid' || !formState.userAgreementChecked
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      accountVariant: validatedAccountVariant.accountVariant,
                      userAgreementChecked: formState.userAgreementChecked
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.userAgreementChecked, formState.accountVariant]);

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
