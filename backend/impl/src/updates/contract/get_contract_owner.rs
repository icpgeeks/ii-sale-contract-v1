use crate::read_state;
use common_contract_api::get_contract_owner::*;
use ic_cdk_macros::update;

#[update]
fn get_contract_owner(_args: Args) -> Response {
    get_contract_owner_int().into()
}

pub(crate) fn get_contract_owner_int() -> Result<GetContractOwnerResult, GetContractOwnerError> {
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
            Ok(GetContractOwnerResult { owner })
        } else {
            Err(GetContractOwnerError::ContractNotActivated)
        }
    })
}
