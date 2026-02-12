use common_contract_api::get_contract_certificate::*;
use ic_cdk_macros::update;

use crate::read_state;

#[update]
fn get_contract_certificate(_args: Args) -> Response {
    read_state(|state| {
        Response::Ok(GetContractCertificateResult {
            certificate: state
                .get_model()
                .get_init_contract_args()
                .certificate
                .clone(),
        })
    })
}
