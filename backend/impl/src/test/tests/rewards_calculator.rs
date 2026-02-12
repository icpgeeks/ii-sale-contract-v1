use crate::{
    components::Settings,
    get_env,
    handlers::rewards_calculator::RewardsCalculator,
    test::tests::{
        components::ledger::HT_LEDGER_FEE, ht_create_settings, ht_init_test_contract_with_settings,
    },
};

#[tokio::test]
async fn test_rewards_calculator() {
    ht_init_test_contract_with_settings(
        1,
        None,
        Settings {
            referral_reward_permyriad: 100,
            developer_reward_permyriad: 200,
            hub_reward_permyriad: 700,
            ..ht_create_settings()
        },
    );
    let env = get_env();

    let seller_price = 1_000_000;
    let balance = seller_price - HT_LEDGER_FEE;

    let calculator = RewardsCalculator::new(env.as_ref(), seller_price)
        .await
        .unwrap();
    let seller_amount = calculator.get_seller_amount().unwrap();

    assert_eq!(calculator.get_ledger_fee(), HT_LEDGER_FEE);
    assert_eq!(seller_amount, 900_000);
    let referral_reward_target = 10_000;
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        referral_reward_target
    );
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + referral_reward_target
            )
            .unwrap()
            .unwrap(),
        referral_reward_target
    );
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + referral_reward_target - 1
            )
            .unwrap(),
        None
    );

    // developer reward
    let balance = balance - HT_LEDGER_FEE - referral_reward_target;

    let developer_reward_target = 20_000;
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        developer_reward_target
    );
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + developer_reward_target
            )
            .unwrap()
            .unwrap(),
        developer_reward_target
    );
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + developer_reward_target - 1
            )
            .unwrap(),
        None
    );

    // hub reward
    let balance = balance - HT_LEDGER_FEE - developer_reward_target;

    let hub_reward_target = 70_000 - 5 * HT_LEDGER_FEE;
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        hub_reward_target
    );
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + 1)
            .unwrap()
            .unwrap(),
        1
    );
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE)
            .unwrap(),
        None
    );

    // seller
    let balance = balance - HT_LEDGER_FEE - hub_reward_target;
    assert_eq!(balance, seller_amount + HT_LEDGER_FEE);
}

#[tokio::test]
async fn test_rewards_calculator_with_rest() {
    ht_init_test_contract_with_settings(
        1,
        None,
        Settings {
            referral_reward_permyriad: 100,
            developer_reward_permyriad: 200,
            hub_reward_permyriad: 700,
            ..ht_create_settings()
        },
    );
    let env = get_env();

    let seller_price = 1_000_001;
    let balance = seller_price - HT_LEDGER_FEE;

    let calculator = RewardsCalculator::new(env.as_ref(), seller_price)
        .await
        .unwrap();
    let seller_amount = calculator.get_seller_amount().unwrap();

    assert_eq!(calculator.get_ledger_fee(), HT_LEDGER_FEE);
    assert_eq!(seller_amount, 900_000);
    let referral_reward_target = 10_000;
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        referral_reward_target
    );
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + referral_reward_target
            )
            .unwrap()
            .unwrap(),
        referral_reward_target
    );
    assert_eq!(
        calculator
            .calculate_referral_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + referral_reward_target - 1
            )
            .unwrap(),
        None
    );

    // developer reward
    let balance = balance - HT_LEDGER_FEE - referral_reward_target;

    let developer_reward_target = 20_000;
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        developer_reward_target
    );
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + developer_reward_target
            )
            .unwrap()
            .unwrap(),
        developer_reward_target
    );
    assert_eq!(
        calculator
            .calculate_developer_reward_transfer_amount(
                seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + developer_reward_target - 1
            )
            .unwrap(),
        None
    );

    // hub reward
    let balance = balance - HT_LEDGER_FEE - developer_reward_target;

    let hub_reward_target = 70_000 - 5 * HT_LEDGER_FEE + 1;
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(balance)
            .unwrap()
            .unwrap(),
        hub_reward_target
    );
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE + 1)
            .unwrap()
            .unwrap(),
        1
    );
    assert_eq!(
        calculator
            .calculate_hub_reward_transfer_amount(seller_amount + HT_LEDGER_FEE + HT_LEDGER_FEE)
            .unwrap(),
        None
    );

    // seller
    let balance = balance - HT_LEDGER_FEE - hub_reward_target;
    assert_eq!(balance, seller_amount + HT_LEDGER_FEE);
}
