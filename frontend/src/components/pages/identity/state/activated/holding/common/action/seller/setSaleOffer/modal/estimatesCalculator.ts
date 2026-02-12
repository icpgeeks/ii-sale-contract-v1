import {isNullish} from '@dfinity/utils';

export type Estimates = {
    referralRewardUlps: bigint;
    developerRewardUlps: bigint;
    hubRewardUlps: bigint;
    hubRewardIncludingTransactionFeesUlps: bigint;
    totalRewardUlps: bigint;
    totalRewardIncludingTransactionFeesUlps: bigint;
    sellerAmountUlps: bigint;
};

/**
 *  |                                total_rewards                                | seller_amount |
 *  | referral_reward | developer_reward |               hub_reward               | seller_amount |
 *  | referral_amount | developer_amount | 5 * ledger_fee | hub_amount | [1 round]| seller_amount |
 */
export class EstimatesCalculator {
    private priceUlps: bigint;
    private ledgerFee: bigint;
    private referralRewardPermyriad: bigint;
    private developerRewardPermyriad: bigint;
    private hubRewardPermyriad: bigint;

    constructor(priceUlps: bigint, ledgerFee: bigint, referralRewardPermyriad: bigint, developerRewardPermyriad: bigint, hubRewardPermyriad: bigint) {
        this.priceUlps = priceUlps;
        this.ledgerFee = ledgerFee;
        this.referralRewardPermyriad = referralRewardPermyriad;
        this.developerRewardPermyriad = developerRewardPermyriad;
        this.hubRewardPermyriad = hubRewardPermyriad;
    }

    private getPermyriad(amount: bigint, permyriad: bigint): bigint {
        return (amount * permyriad) / 10_000n;
    }

    public getSellerAmount(): bigint {
        const sellerPermyriad = 10_000n - this.referralRewardPermyriad - this.developerRewardPermyriad - this.hubRewardPermyriad;

        if (sellerPermyriad < 0n) {
            throw new Error('can not calculate seller permyriad');
        }

        return this.getPermyriad(this.priceUlps, sellerPermyriad);
    }

    private getAllowedAmountForRewardTransaction(accountBalance: bigint): bigint {
        return accountBalance - this.getSellerAmount() - this.ledgerFee - this.ledgerFee;
    }

    public getLedgerFee(): bigint {
        return this.ledgerFee;
    }

    public calculateReferralRewardTransferAmount(accountBalance: bigint): bigint | undefined {
        const amount = this.getPermyriad(this.priceUlps, this.referralRewardPermyriad);
        return amount <= this.getAllowedAmountForRewardTransaction(accountBalance) ? amount : undefined;
    }

    public calculateDeveloperRewardTransferAmount(accountBalance: bigint): bigint | undefined {
        const amount = this.getPermyriad(this.priceUlps, this.developerRewardPermyriad);
        return amount <= this.getAllowedAmountForRewardTransaction(accountBalance) ? amount : undefined;
    }

    public calculateHubRewardTransferAmount(accountBalance: bigint): bigint | undefined {
        const allowed = this.getAllowedAmountForRewardTransaction(accountBalance);
        return allowed > 0n ? allowed : undefined;
    }

    public getEstimates(): Estimates | undefined {
        /**
         * Referral reward
         */
        let balance = this.priceUlps - this.ledgerFee;
        const referralRewardUlps = this.calculateReferralRewardTransferAmount(balance);
        if (isNullish(referralRewardUlps)) {
            return undefined;
        }

        /**
         * Developer reward
         */
        balance = balance - this.ledgerFee - referralRewardUlps;
        const developerRewardUlps = this.calculateDeveloperRewardTransferAmount(balance);
        if (isNullish(developerRewardUlps)) {
            return undefined;
        }

        /**
         * Hub reward
         */
        balance = balance - this.ledgerFee - developerRewardUlps;
        const hubRewardUlps = this.calculateHubRewardTransferAmount(balance);
        if (isNullish(hubRewardUlps)) {
            return undefined;
        }
        const hubRewardIncludingTransactionFeesUlps = hubRewardUlps + this.ledgerFee * 5n;

        /**
         * Seller
         */
        const sellerAmountUlps = this.getSellerAmount();

        /**
         * Other calculations
         */

        const totalRewardUlps = referralRewardUlps + developerRewardUlps + hubRewardUlps;
        const totalRewardIncludingTransactionFeesUlps = referralRewardUlps + developerRewardUlps + hubRewardIncludingTransactionFeesUlps;

        return {
            referralRewardUlps,
            developerRewardUlps,
            hubRewardUlps,
            hubRewardIncludingTransactionFeesUlps,
            totalRewardUlps,
            totalRewardIncludingTransactionFeesUlps,
            sellerAmountUlps
        };
    }
}
