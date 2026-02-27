import {describe, expect, it} from 'vitest';
import {EstimatesCalculator, type Estimates} from './estimatesCalculator';

// Base setup shared across per-method tests:
// price=1_000_000n, fee=10_000n, ref=1% (100‱), dev=2% (200‱), hub=7% (700‱) → seller=90% (9000‱)
const BASE_PRICE = 1_000_000n;
const BASE_FEE = 10_000n;
const REF_PERMYRIAD = 100n;
const DEV_PERMYRIAD = 200n;
const HUB_PERMYRIAD = 700n;

const makeCalc = (price = BASE_PRICE) => new EstimatesCalculator(price, BASE_FEE, REF_PERMYRIAD, DEV_PERMYRIAD, HUB_PERMYRIAD);

describe('estimatesCalculator', () => {
    describe('EstimatesCalculator', () => {
        describe('getLedgerFee', () => {
            it('returns the ledger fee passed in constructor', () => {
                expect(makeCalc().getLedgerFee()).toBe(BASE_FEE);
            });
        });

        describe('getSellerAmount', () => {
            it('returns floor(price × sellerPermyriad / 10 000)', () => {
                // sellerPermyriad = 10000 - 100 - 200 - 700 = 9000
                // 1_000_000 × 9000 / 10000 = 900_000
                expect(makeCalc().getSellerAmount()).toBe(900_000n);
            });

            it('floors the result when division is not exact', () => {
                // 1_000_001 × 9000 / 10000 = 900_000.9 → 900_000
                expect(makeCalc(1_000_001n).getSellerAmount()).toBe(900_000n);
            });

            it('throws when sum of reward permyriads exceeds 10 000', () => {
                const calc = new EstimatesCalculator(BASE_PRICE, BASE_FEE, 5000n, 5000n, 5000n);
                expect(() => calc.getSellerAmount()).toThrow('can not calculate seller permyriad');
            });
        });

        describe('calculateReferralRewardTransferAmount', () => {
            it('returns floor(price × referralPermyriad / 10 000) when balance is sufficient', () => {
                // referralAmount = 1_000_000 × 100 / 10_000 = 10_000
                const balance = BASE_PRICE - BASE_FEE; // 990_000
                expect(makeCalc().calculateReferralRewardTransferAmount(balance)).toBe(10_000n);
            });

            it('returns undefined when balance is insufficient', () => {
                expect(makeCalc().calculateReferralRewardTransferAmount(0n)).toBeUndefined();
            });
        });

        describe('calculateDeveloperRewardTransferAmount', () => {
            it('returns floor(price × developerPermyriad / 10 000) when balance is sufficient', () => {
                // developerAmount = 1_000_000 × 200 / 10_000 = 20_000
                const balance = BASE_PRICE - BASE_FEE;
                expect(makeCalc().calculateDeveloperRewardTransferAmount(balance)).toBe(20_000n);
            });

            it('returns undefined when balance is insufficient', () => {
                expect(makeCalc().calculateDeveloperRewardTransferAmount(0n)).toBeUndefined();
            });
        });

        describe('calculateHubRewardTransferAmount', () => {
            it('returns allowed amount when balance is sufficient', () => {
                // getAllowed(990_000) = 990_000 - 900_000 - 10_000 - 10_000 = 70_000
                const balance = BASE_PRICE - BASE_FEE;
                expect(makeCalc().calculateHubRewardTransferAmount(balance)).toBe(70_000n);
            });

            it('returns undefined when allowed amount is zero or negative', () => {
                expect(makeCalc().calculateHubRewardTransferAmount(0n)).toBeUndefined();
            });
        });

        describe('getEstimates', () => {
            it.each([
                {
                    label: 'whole number price',
                    price: 1_000_000n,
                    expectedReferral: 10_000n,
                    expectedDeveloper: 20_000n,
                    expectedHub: 20_000n,
                    expectedSeller: 900_000n
                },
                {
                    label: 'price with remainder (floor applied to all amounts)',
                    price: 1_000_001n,
                    expectedReferral: 10_000n,
                    expectedDeveloper: 20_000n,
                    expectedHub: 20_001n,
                    expectedSeller: 900_000n
                }
            ])('returns correct estimates for $label', ({price, expectedReferral, expectedDeveloper, expectedHub, expectedSeller}) => {
                const calc = makeCalc(price);
                expect(calc.getEstimates()).toEqual({
                    referralRewardUlps: expectedReferral,
                    developerRewardUlps: expectedDeveloper,
                    hubRewardUlps: expectedHub,
                    hubRewardIncludingTransactionFeesUlps: expectedHub + 5n * BASE_FEE,
                    totalRewardUlps: expectedReferral + expectedDeveloper + expectedHub,
                    totalRewardIncludingTransactionFeesUlps: expectedReferral + expectedDeveloper + expectedHub + 5n * BASE_FEE,
                    sellerAmountUlps: expectedSeller
                } satisfies Estimates);
            });

            it('returns undefined when price is too small to cover fees and rewards', () => {
                // price=100n, fee=100n → balance after fee = 0; sellerAmount=90n; getAllowed(0)=-290n < referralAmount
                const calc = new EstimatesCalculator(100n, 100n, REF_PERMYRIAD, DEV_PERMYRIAD, HUB_PERMYRIAD);
                expect(calc.getEstimates()).toBeUndefined();
            });
        });
    });
});
