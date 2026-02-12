import {describe, expect, it} from 'vitest';
import {EstimatesCalculator, type Estimates} from './estimatesCalculator';

describe('estimatesCalculator', () => {
    describe('EstimatesCalculator', () => {
        it('should calculate estimates correctly', () => {
            const seller_price = 1_000_000n;
            const ledgerFeeUlps = 10_000n;

            const calculator = new EstimatesCalculator(seller_price, ledgerFeeUlps, 100n, 200n, 700n);
            expect(calculator.getLedgerFee()).toBe(ledgerFeeUlps);

            const seller_amount = calculator.getSellerAmount();
            expect(seller_amount).toBe(900_000n);

            /**
             * Referral reward
             */
            let balance = seller_price - ledgerFeeUlps;
            const referral_reward_target = 10_000n;
            expect(calculator.calculateReferralRewardTransferAmount(balance)).toBe(referral_reward_target);

            /**
             * Developer reward
             */
            balance = balance - ledgerFeeUlps - referral_reward_target;
            const developer_reward_target = 20_000n;
            expect(calculator.calculateDeveloperRewardTransferAmount(balance)).toBe(developer_reward_target);

            /**
             * Hub reward
             */
            balance = balance - ledgerFeeUlps - developer_reward_target;
            const hub_reward_target = seller_price - seller_amount - referral_reward_target - developer_reward_target - 5n * ledgerFeeUlps;
            expect(calculator.calculateHubRewardTransferAmount(balance)).toBe(hub_reward_target);

            /**
             * Seller
             */
            balance = balance - ledgerFeeUlps - hub_reward_target;
            expect(balance).toBe(seller_amount + ledgerFeeUlps);

            /**
             * Estimates
             */
            expect(calculator.getEstimates()).toEqual({
                developerRewardUlps: developer_reward_target,
                referralRewardUlps: referral_reward_target,
                hubRewardUlps: hub_reward_target,
                hubRewardIncludingTransactionFeesUlps: hub_reward_target + 5n * ledgerFeeUlps,
                totalRewardUlps: referral_reward_target + developer_reward_target + hub_reward_target,
                totalRewardIncludingTransactionFeesUlps: referral_reward_target + developer_reward_target + hub_reward_target + 5n * ledgerFeeUlps,
                sellerAmountUlps: seller_amount
            } satisfies Estimates);
        });

        it('should calculate estimates correctly with extra 1e8s', () => {
            const seller_price = 1_000_001n;
            const ledgerFeeUlps = 10_000n;

            const calculator = new EstimatesCalculator(seller_price, ledgerFeeUlps, 100n, 200n, 700n);
            expect(calculator.getLedgerFee()).toBe(ledgerFeeUlps);

            const seller_amount = calculator.getSellerAmount();
            expect(seller_amount).toBe(900_000n);

            /**
             * Referral reward
             */
            let balance = seller_price - ledgerFeeUlps;
            const referral_reward_target = 10_000n;
            expect(calculator.calculateReferralRewardTransferAmount(balance)).toBe(referral_reward_target);

            /**
             * Developer reward
             */
            balance = balance - ledgerFeeUlps - referral_reward_target;
            const developer_reward_target = 20_000n;
            expect(calculator.calculateDeveloperRewardTransferAmount(balance)).toBe(developer_reward_target);

            /**
             * Hub reward
             */
            balance = balance - ledgerFeeUlps - developer_reward_target;
            const hub_reward_target = seller_price - seller_amount - referral_reward_target - developer_reward_target - 5n * ledgerFeeUlps;
            expect(calculator.calculateHubRewardTransferAmount(balance)).toBe(hub_reward_target);

            /**
             * Seller
             */
            balance = balance - ledgerFeeUlps - hub_reward_target;
            expect(balance).toBe(seller_amount + ledgerFeeUlps);

            /**
             * Estimates
             */
            expect(calculator.getEstimates()).toEqual({
                developerRewardUlps: developer_reward_target,
                referralRewardUlps: referral_reward_target,
                hubRewardUlps: hub_reward_target,
                hubRewardIncludingTransactionFeesUlps: hub_reward_target + 5n * ledgerFeeUlps,
                totalRewardUlps: referral_reward_target + developer_reward_target + hub_reward_target,
                totalRewardIncludingTransactionFeesUlps: referral_reward_target + developer_reward_target + hub_reward_target + 5n * ledgerFeeUlps,
                sellerAmountUlps: seller_amount
            } satisfies Estimates);
        });
    });
});
