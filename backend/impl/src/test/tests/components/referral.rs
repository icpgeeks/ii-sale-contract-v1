use async_trait::async_trait;
use candid::Principal;
use common_canister_types::LedgerAccount;
use common_contract_api::ContractCertificate;
use contract_canister_api::types::holder::ReferralRewardData;

use crate::components::referral::Referral;

pub struct ReferralTest;

#[async_trait]
impl Referral for ReferralTest {
    async fn get_referral_reward_data(
        &self,
        certificate: ContractCertificate,
        _contract_owner: Principal,
        referral: String,
        _from_account_hex: String,
    ) -> Result<Option<ReferralRewardData>, String> {
        match referral.as_str() {
            "one_percent" => Ok(Some(ReferralRewardData {
                account: ht_get_referral_account(),
                memo: certificate.contract_template_id,
            })),
            "none" => Ok(None),
            _ => Err("Error".to_string()),
        }
    }
}

pub(crate) fn ht_get_referral_account() -> LedgerAccount {
    LedgerAccount::Account {
        owner: Principal::management_canister(),
        subaccount: None,
    }
}
