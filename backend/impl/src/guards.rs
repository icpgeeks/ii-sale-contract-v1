use crate::{get_env, read_state};

pub(crate) fn contract_is_activated() -> Result<(), String> {
    if read_state(|state| state.get_model().is_contract_activated()) {
        Ok(())
    } else {
        Err("Contract is not activated".to_owned())
    }
}

pub(crate) fn caller_is_owner() -> Result<(), String> {
    read_state(|state| {
        let model = state.get_model();
        if model.is_contract_activated() {
            let owner = model
                .get_holder()
                .get_holder_model()
                .owner
                .as_ref()
                .unwrap()
                .value;
            let caller = state.get_env().get_ic().get_caller();
            if owner == caller {
                Ok(())
            } else {
                Err("Caller is not owner".to_string())
            }
        } else {
            Err("Contract is not activated".to_owned())
        }
    })
}

pub(crate) fn caller_is_authenticated() -> Result<(), String> {
    if get_env().get_ic().is_caller_anonymous() {
        Err("Caller is not authenticated".to_owned())
    } else {
        Ok(())
    }
}
