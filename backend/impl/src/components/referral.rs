use async_trait::async_trait;
use candid::Principal;
use common_canister_types::LedgerAccount;
use common_contract_api::ContractCertificate;
use contract_canister_api::types::holder::ReferralRewardData;
use ic_ledger_types::AccountIdentifier;
use referral_c2c_client::{
    get_referral_reward_data, GetReferralRewardDataArgs, GetReferralRewardDataError,
    GetReferralRewardDataResult,
};

#[async_trait]
pub trait Referral {
    async fn get_referral_reward_data(
        &self,
        certificate: ContractCertificate,
        contract_owner: Principal,
        referral: String,
        from_account_hex: String,
    ) -> Result<Option<ReferralRewardData>, String>;
}

pub struct ReferralImpl {
    referral_canister_id: Principal,
}

impl ReferralImpl {
    pub fn new(referral_canister_id: Principal) -> Self {
        Self {
            referral_canister_id,
        }
    }
}

#[async_trait]
impl Referral for ReferralImpl {
    async fn get_referral_reward_data(
        &self,
        certificate: ContractCertificate,
        contract_owner: Principal,
        referral: String,
        from_account_hex: String,
    ) -> Result<Option<ReferralRewardData>, String> {
        let args = GetReferralRewardDataArgs {
            referral,
            hub_canister: certificate.hub_canister,
            deployer: certificate.deployer,
            contract_template_id: certificate.contract_template_id,
            contract_canister: certificate.contract_canister,
            contract_owner,
            from_account_hex,
        };

        match get_referral_reward_data(self.referral_canister_id, args).await {
            Ok(result) => Ok(Some(result_to_referral_reward_data(result)?)),
            Err(GetReferralRewardDataError::ReferralNotFound) => Ok(None),
            Err(GetReferralRewardDataError::CallError { reason }) => Err(reason),
        }
    }
}

fn result_to_referral_reward_data(
    result: GetReferralRewardDataResult,
) -> Result<ReferralRewardData, String> {
    let account_identifier = AccountIdentifier::from_hex(&result.account_hex)?;
    let account = LedgerAccount::AccountIdentifier {
        slice: account_identifier.as_bytes().to_vec(),
    };
    Ok(ReferralRewardData {
        account,
        memo: result.memo,
    })
}
