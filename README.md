# Internet Identity Sale Contract v1.0

This single-use smart contract enables trustless sale of an entire Internet Identity along with all linked assets, accounts, permissions, and dapp accesses. It provides key functionality like listing, offers, validation, ownership transfer, and payments. The contract is issued with a cryptographic certificate, which makes it fully immutable for the entire certification period.

## Key Parameters

- Certificate Length: 100 days
- Cooldown Period: 30 days
- Safety Window: 10 days
- Max Accounts Allowed: 1000
- Max Neurons Allowed: 1000
- Min Price: 1 ICP
- Initial Cycles: 5T
- Critical Cycle Threshold: 0.7T
- Canister Freezing Threshold: 90 days

## Features

- Operates as isolated canister with no shared state and no external controllers once deployed.
- Receives 100-day certificate providing full immutability while valid.
- Takes temporary exclusive custody and control of Internet Identity by removing all other passkeys, including seed phrase.
- Removes all neuron hotkeys to eliminate residual control by seller.
- Detects and displays ICP accounts and neurons from NNS Dapp.
- Enforces mandatory 30-day cooldown period for all active sessions to expire.
- Validates ICP accounts and neurons after cooldown.
- Blocks sale if total value decreases after validation.
- Blocks sale if unspent ICP allowances on NNS accounts are detected during Internet Identity transfer or after validation.
- Preserves neuron followees and voting settings.
- Makes data available for permissionless indexing and display by third-party storefronts and explorers.
- Supports fixed-price direct purchases and non-binding counter offers.
- Processes payments with OISY wallet approve transactions in order to hold funds only during atomic sale finalization.
- Protects participants with 10-day pre-expiration safety window during which all ICP allowances expire, and no new listings, offers, or sales are allowed.
- Suspends sale operations when cycles are insufficient, until topped up.
- Finalizes sale by transferring ICP to seller's chosen payout address and Internet Identity and contract ownership to buyer.
- Allows seller to transfer Internet Identity to device at any time before buyer makes direct purchase or seller accepts counter offer.
- Allows buyer to transfer Internet Identity to device at any time after purchase.
- Allows owner to add controller after certificate expires to enable recovery if necessary.

## Limitations

- Allows only one sale, meaning that once the Identity is sold, the contract no longer supports re-selling and a new contract must be deployed for any future sale.
- Transfers the entire Internet Identity including all assets, balances, SNS tokens, permissions, and dapp-linked data to buyer as is, without inspection or modification, and cannot be selectively excluded.
- Requires activation using different Internet Identity than one being sold.
- Ignores neurons controlled by hotkeys or hardware wallets, as they are non-transferable; such neurons are not displayed.
- Checks ICP unspent allowances only on NNS-visible subaccounts and the first 10 incremental subaccounts (any additional allowances may remain undetected).
- Ignores allowances on SNS tokens, ck-tokens or in external dapps such as ICPSwap, KongSwap, OpenChat, etc.
- Updates neuron and account state only twice (on initial transfer and post-cooldown validation) to avoid high cycle costs.
- Blocks sale if Internet Identity has more than 1000 accounts or 1000 neurons (including legacy maturity-spawned neurons).
- Consumes cycles heavily when removing passkeys, removing hotkeys, and validating neurons, which may require additional cycle top-ups.
- Continues to operate if template is blocked, but is considered unsafe and fails validation.

## Fees

This contract applies 2% fee upon successful sale:

- 1% to referrer
- 0.5% to contract developer
- 0.5% to GEEKFACTORY

## Important Notes and Risks

- All contract operations are fully defined in source code that is open and available for review.
- All contract interactions are performed at your own risk.
- Internet Identity transfers and sales are complex, experimental, and may fail or result in partial or total loss of access, assets, or funds.
- All transactions are final and no refunds, reversals, or cancellations are possible once sale is completed.
- Buyer inherits all risks, liabilities, and obligations associated with Internet Identity, including those from KYC services, linked dapps, or external accounts.
- Sales are not guaranteed since listings are part of open market and may never result in sale.
- Contract must be validated before interaction, even if contract URL comes from trusted source.
- Listing details should be verified directly on contract because storefronts may be outdated, incorrect, or compromised.
- Transferring Internet Identity into contract removes seller access and control of all linked dapps and assets once active sessions expire.
- Changes to Internet Computer protocol or API may cause transfers or sale operations to fail, potentially leaving Internet Identity or ICP payment stuck inside contract until certificate expires and owner manually upgrades contract to recover assets.
- Additional cycles may be required if NNS increases operational costs through governance decisions.
- There is significant risk of permanent Internet Identity loss if contract remains without cycles beyond freezing threshold and loses state.
- This contract checks unspent allowances only within limited scope, therefore DO NOT store funds on accounts of purchased Internet Identity outside of this scope without checking for unspent allowances.
- If any problems occur, this contract cannot be upgraded or modified while its certificate is valid.
- If any recovery or upgrade is necessary after certificate expires, it is entirely responsibility of owner.

## Disclaimer

This contract is provided as-is and used entirely at your own risk.

Interactions involve technical, operational, protocol, and market risks and may fail or result in partial or total loss of access, assets, or funds. Sales are not guaranteed, and all transactions are final and irreversible.

This description does not cover all possible risks, limitations, or edge cases. Actual contract logic, operations and limitations are defined solely by source code that is open and available for review.

## Resources

- [License](LICENSE)
- [Terms of Use](TERMS.md)
- [FAQ](FAQ.md)
- [GeekFactory Hub](https://github.com/geekfactory-core/hub)
