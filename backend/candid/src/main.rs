use icgeek_candid_gen::*;

#[allow(deprecated)]
fn main() {
    generate_init_candid_method!(common_contract_api, init_contract);

    generate_query_candid_method!(common_canister_api, get_canister_metrics);
    generate_query_candid_method!(contract_canister_api, get_holder_events);
    generate_query_candid_method!(contract_canister_api, transform_http_response);
    generate_query_candid_method!(contract_canister_api, get_holder_information_query);

    generate_update_candid_method!(common_canister_api, get_canister_status, None);
    generate_update_candid_method!(common_contract_api, get_contract_owner);
    generate_update_candid_method!(common_contract_api, activate_contract);
    generate_update_candid_method!(common_contract_api, get_contract_certificate);
    generate_update_candid_method!(common_contract_api, add_contract_controller);
    generate_update_candid_method!(contract_canister_api, get_holder_information);
    generate_update_candid_method!(contract_canister_api, process_holder);
    generate_update_candid_method!(contract_canister_api, start_capture_identity);
    generate_update_candid_method!(contract_canister_api, start_release_identity);
    generate_update_candid_method!(contract_canister_api, restart_release_identity);
    generate_update_candid_method!(contract_canister_api, cancel_capture_identity);
    generate_update_candid_method!(contract_canister_api, protected_authn_method_deleted);
    generate_update_candid_method!(
        contract_canister_api,
        confirm_holder_authn_method_registration
    );
    generate_update_candid_method!(contract_canister_api, retry_prepare_delegation);
    generate_update_candid_method!(contract_canister_api, delete_holder_authn_method);
    generate_update_candid_method!(contract_canister_api, receive_delegation);
    generate_update_candid_method!(
        contract_canister_api,
        confirm_owner_authn_method_registration
    );
    generate_update_candid_method!(contract_canister_api, set_sale_intention);
    generate_update_candid_method!(contract_canister_api, change_sale_intention);
    generate_update_candid_method!(contract_canister_api, set_sale_offer);
    generate_update_candid_method!(contract_canister_api, accept_buyer_offer);
    generate_update_candid_method!(contract_canister_api, accept_seller_offer);
    generate_update_candid_method!(contract_canister_api, cancel_sale_intention);
    generate_update_candid_method!(contract_canister_api, set_buyer_offer);
    generate_update_candid_method!(contract_canister_api, cancel_buyer_offer);

    candid::export_service!();
    std::print!("{}", __export_service());
}
