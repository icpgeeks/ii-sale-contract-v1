use common_canister_types::TokenE8s;
use contract_canister_api::types::holder::HolderProcessingError;

use crate::components::Environment;

/// |                                total_rewards                                | seller_amount |
/// | referral_reward | developer_reward |               hub_reward               | seller_amount |
/// | referral_amount | developer_amount | 5 * ledger_fee | hub_amount | [1 round]| seller_amount |
pub(crate) struct RewardsCalculator {
    sell_price: TokenE8s,
    ledger_fee: TokenE8s,
    developer_reward_permyriad: u32,
    referral_reward_permyriad: u32,
    hub_reward_permyriad: u32,
}

impl RewardsCalculator {
    pub async fn new(
        env: &Environment,
        sell_price: TokenE8s,
    ) -> Result<Self, HolderProcessingError> {
        let ledger_fee = env.get_ledger().get_ledger_fee().await.map_err(|error| {
            HolderProcessingError::IcAgentError {
                error: format!("{error:?}"),
                retry_delay: None,
            }
        })?;

        let settings = env.get_settings();

        Ok(Self {
            sell_price,
            ledger_fee,
            developer_reward_permyriad: settings.developer_reward_permyriad,
            referral_reward_permyriad: settings.referral_reward_permyriad,
            hub_reward_permyriad: settings.hub_reward_permyriad,
        })
    }

    pub(crate) fn get_seller_amount(&self) -> Result<TokenE8s, String> {
        let seller_permyriad = 10_000u32
            .checked_sub(self.referral_reward_permyriad)
            .and_then(|r| r.checked_sub(self.developer_reward_permyriad))
            .and_then(|r| r.checked_sub(self.hub_reward_permyriad))
            .ok_or("cannot calculate seller permyriad".to_owned())?;

        get_permyriad(self.sell_price, seller_permyriad)
    }

    fn get_allowed_amount_for_reward_transaction(
        &self,
        account_balance: TokenE8s,
    ) -> Result<TokenE8s, String> {
        Ok(account_balance
            .saturating_sub(self.get_seller_amount()?)
            .saturating_sub(self.ledger_fee)
            .saturating_sub(self.ledger_fee))
    }

    pub(crate) fn get_ledger_fee(&self) -> TokenE8s {
        self.ledger_fee
    }

    // Calculate referral reward transfer amount.
    // Ensure that after transferring the referral reward,
    // sufficient funds remain for the seller amount.
    pub(crate) fn calculate_referral_reward_transfer_amount(
        &self,
        account_balance: TokenE8s,
    ) -> Result<Option<TokenE8s>, String> {
        let amount = get_permyriad(self.sell_price, self.referral_reward_permyriad)?;
        if amount <= self.get_allowed_amount_for_reward_transaction(account_balance)? {
            Ok(Some(amount))
        } else {
            Ok(None)
        }
    }

    // Calculate developer reward transfer amount.
    // Ensure that after transferring the developer reward,
    // sufficient funds remain for the seller amount.
    pub(crate) fn calculate_developer_reward_transfer_amount(
        &self,
        account_balance: TokenE8s,
    ) -> Result<Option<TokenE8s>, String> {
        let amount = get_permyriad(self.sell_price, self.developer_reward_permyriad)?;
        if amount <= self.get_allowed_amount_for_reward_transaction(account_balance)? {
            Ok(Some(amount))
        } else {
            Ok(None)
        }
    }

    // Calculate hub reward transfer amount.
    // Ensure that after transferring the hub reward,
    // sufficient funds remain for the seller amount.
    pub(crate) fn calculate_hub_reward_transfer_amount(
        &self,
        account_balance: TokenE8s,
    ) -> Result<Option<TokenE8s>, String> {
        self.get_allowed_amount_for_reward_transaction(account_balance)
            .map(|r| if r > 0 { Some(r) } else { None })
    }
}

pub(crate) fn get_permyriad(amount: TokenE8s, permyriad: u32) -> Result<TokenE8s, String> {
    (amount as u128)
        .checked_mul(permyriad as u128)
        .and_then(|r| r.checked_div(10_000))
        .and_then(|r| r.try_into().ok())
        .ok_or(format!("Error getting permyriad {permyriad} from {amount}"))
}
