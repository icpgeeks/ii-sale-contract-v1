use candid::Principal;
use common_canister_impl::components::nns::api::{Neuron, NeuronId};
use common_canister_types::TokenE8s;

/// Creates a fake neuron with a non-zero stake (stake = 12, maturity = 13, cached = 14).
pub(crate) fn fake_neuron(
    id: u64,
    controller: Option<Principal>,
    hot_keys: Vec<Principal>,
) -> Neuron {
    fake_neuron_int(id, controller, hot_keys, 12)
}

/// Creates a fake neuron with **zero stake** (all stake/maturity fields = 0, `None` for
/// `staked_maturity_e8s_equivalent`).
///
/// Use this when a test needs a neuron that should be ignored by the asset-validation
/// logic (zero-balance neurons are not counted toward the neuron limit).
#[allow(dead_code)]
pub(crate) fn fake_neuron_zero_stake(
    id: u64,
    controller: Option<Principal>,
    hot_keys: Vec<Principal>,
) -> Neuron {
    fake_neuron_int(id, controller, hot_keys, 0)
}

fn fake_neuron_int(
    id: u64,
    controller: Option<Principal>,
    hot_keys: Vec<Principal>,
    value: TokenE8s,
) -> Neuron {
    let (staked_maturity_e8s_equivalent, maturity_e8s_equivalent, cached_neuron_stake_e8s) =
        if value == 0 {
            (None, 0, 0)
        } else {
            (Some(value), value + 1, value + 2)
        };
    Neuron {
        id: Some(NeuronId { id }),
        staked_maturity_e8s_equivalent,
        controller,
        recent_ballots: vec![],
        voting_power_refreshed_timestamp_seconds: None,
        kyc_verified: true,
        potential_voting_power: None,
        neuron_type: None,
        not_for_profit: true,
        maturity_e8s_equivalent,
        deciding_voting_power: None,
        cached_neuron_stake_e8s,
        created_timestamp_seconds: 1111,
        auto_stake_maturity: None,
        aging_since_timestamp_seconds: 22222,
        hot_keys,
        account: vec![1].into(),
        joined_community_fund_timestamp_seconds: None,
        dissolve_state: None,
        followees: vec![],
        neuron_fees_e8s: 0,
        visibility: None,
        transfer: None,
        known_neuron_data: None,
        spawn_at_timestamp_seconds: None,
    }
}
