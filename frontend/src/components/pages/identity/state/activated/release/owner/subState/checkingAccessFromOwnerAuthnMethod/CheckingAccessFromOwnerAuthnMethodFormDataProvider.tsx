import {useSimpleReducer, type DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {createContext, useContext, useMemo, type Dispatch, type PropsWithChildren} from 'react';

type FormState = {
    userAgreementChecked?: boolean;
};

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formDataAvailability: DataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useCheckingAccessFromOwnerAuthnMethodFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useCheckingAccessFromOwnerAuthnMethodFormDataContext must be used within a CheckingAccessFromOwnerAuthnMethodFormDataProvider');
    }
    return context;
};

export const CheckingAccessFromOwnerAuthnMethodFormDataProvider = (props: PropsWithChildren) => {
    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    const formDataAvailability = useMemo<DataAvailability>(() => {
        if (!formState.userAgreementChecked) {
            return {type: 'notAvailable'};
        }
        return {
            type: 'available'
        };
    }, [formState.userAgreementChecked]);

    const value = useMemo<Context>(() => {
        return {
            formState,
            updateFormState,
            formDataAvailability
        };
    }, [formState, updateFormState, formDataAvailability]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
