# FAQ

This document contains frequently asked questions about the Internet Identity Sale Contract.
It is a living document and may be updated as new questions arise.

## General Information

### What is the Internet Identity Sale Contract?

Internet Identity Sale Contract is a single-use smart contract, which enables trustless sale of an entire Internet Identity along with all linked assets, accounts, permissions, and dapp accesses. It provides key functionality like listing, offers, validation, ownership transfer, and payments.

Internet Identity Sale Contract is deployed through the GeekFactory Smart Contract Hub as a separate contract instance. Each deployment runs in its own canister and is issued a certificate with a fixed expiration timestamp.

The contract logic uses the certificate period to restrict controller changes and code upgrades. While the certificate is valid, the contract’s behavior cannot be modified. As a result, the sale process relies only on the contract code deployed for that specific instance, without depending on the Hub, any interface, or any third party after deployment.

### Why do I need a separate contract instead of using a centralized marketplace?

Using a centralized marketplace usually means that user assets are handled, routed, or controlled by shared infrastructure. Even if such a system is open-source and/or governed by a DAO, the ability to upgrade contracts or intervene in transactions still exists.

Internet Identity Sale Contract is designed so that neither a team, nor developers, nor a DAO can control user assets during the sale. Each Internet Identity sale is executed through a separate, isolated contract instance with its own logic and its own lifecycle.

Once deployed, the contract holds and transfers the Internet Identity strictly according to its code. While the certificate is valid, the contract logic restricts controller changes and upgrades, so no external party can intervene in the sale process.

### How transparent is this contract?

The contract’s source code is publicly available, and the deployed contract can be inspected on-chain. The certificate issued at deployment links the contract to a specific template and defines the period during which the contract logic is restricted from upgrades.

All interactions with the contract are recorded by the contract itself as chronological events and are publicly visible through its interface. These events include actions such as transferring the Internet Identity, submitting offers, accepting a purchase, and executing payouts, along with the timestamp and initiating principal.

<a id="risks"></a>

### What are the risks of using the contract?

This contract implements a complex flow with many interacting parts and protocol-level mechanisms. As a result, a short or centralized list cannot cover all possible risks and edge cases. Some risks and constraints are described throughout this FAQ, in the [seller](#risks-seller) and [buyer](#risks-buyer) risk sections, and in the [contract template](README.md) description. These lists are not complete. The contract code defines all behavior and edge cases and is the only authoritative source of truth.

## Deploying and Activating a Contract

### How do I deploy a contract?

To deploy a contract, select a template from the Hub and follow the deployment flow.

Before continuing, you’re expected to review the template’s settings, license, terms of use, and especially the contract code — since only the code defines how the contract will behave on-chain.

Each deployment requires a one-time ICP payment using your OISY wallet. This amount is converted into cycles required for the deployment operation and funding the contract canister.

Once confirmed, the Hub:

- Creates a new canister
- Deploys the code from the selected template
- Funds the canister with the cycle amount specified in the template
- Issues a certificate with an expiration timestamp specified in the template
- Provides a link to a contract canister and activation instructions

After deployment, the contract runs as an independent canister on the Internet Computer, separate from the Hub and governed entirely by its own code.

### How much does it cost to deploy a contract?

The deployment cost is calculated in ICP and depends on the current ICP-to-cycles conversion rate. The amount covers:

- Contract canister creation and deployment costs
- Funding the canister with the cycle amount specified in the selected template

The exact amount is shown before deployment. All payments are handled via OISY wallet during the deployment process.

<a id="activation"></a>

### How do I activate a contract?

After deployment, the Hub provides an activation instruction with a unique activation code.

To activate the contract:

1. Open the deployed contract
2. Log in to the contract
3. Enter the activation code

This assigns ownership of the contract to you. 

You must activate the contract using an Internet Identity that is different from the one you intend to sell.

### Why do I need to activate the contract?

On the Internet Computer, Internet Identity generates a unique principal for each canister. Because of this, the contract cannot automatically know who deployed it. Activation is the process of claiming the contract using the activation code provided by the Hub. It links your identity to the deployed contract and assigns ownership to you.

<a id="validation"></a>

## Validation and Security

### Why do I always need to validate a contract?

Validation is the easiest way to confirm that you’re interacting with a real contract deployed through the Hub — not a phishing copy or lookalike interface.

It shows:

- That the contract was deployed from a known Hub template
- That the certificate exists and is still valid
- That the contract is activated
- That the original template hasn’t been blocked

This check helps you avoid contracts that were deployed manually, modified after expiration, or built to mimic trusted logic. However, validation doesn’t replace reviewing the code. You should always verify how the contract handles ownership, upgrades, and certificate-based restrictions — especially if immutability matters for your use case.

### How to validate a contract on the Hub?

Copy the full URL of the contract (e.g. https://[canisterID].icp0.io) and open the GeekFactory Hub.

Go to the Validate Contract section, paste the URL, and run the check.

You’ll see a summary showing whether the contract was deployed via the Hub, which template was used, and whether the certificate is still valid.

### Does validation guarantee the contract is safe?

No. Validation is not a security audit. It only checks surface-level metadata — it shows that the contract was deployed through the Hub, from a listed template, and whether its certificate is still valid.

This is useful for detecting fakes, expired contracts, or deployments from blocked templates. But it does not prove that the contract is safe or bug-free.

Full verification should include:

- Checking the certificate metadata to confirm that the contract was deployed through the Hub and to identify its template and expiration date
- Building the template locally and comparing the resulting WASM module with the deployed one
- Ensuring that the contract canister doesn’t have external controllers
- Reviewing the code logic that governs controller assignment
- Reading and understanding the contract’s source code to see how it behaves in different conditions

Only the contract code determines actual on-chain behavior. If immutability or safety is important, you should always verify the code yourself — validation is just the first step.

### What does it mean if a contract’s certificate is invalid or expired?

If the certificate is expired, the contract is no longer within the certificate period defined at deployment. If the contract logic allows it, the owner may now add a controller and upgrade the code.

If the certificate is invalid, it means the Hub can not match the deployed contract to its original deployment record. This usually means the contract code was already changed.

<a id="template-blocked"></a>

### Why can a template be blocked?

A template may be blocked if a critical vulnerability or design flaw is discovered. This prevents new contracts from being deployed from that template through the Hub.

Blocking a template does not affect contracts that were already deployed. Any behavior change in deployed contracts — such as disabling features or showing warnings — depends entirely on the contract code.

### What can go wrong if I skip validation?

Without validation, you may interact with a contract that was never deployed through the Hub, has already been modified, or uses a blocked or expired template. In some cases, this can mean malicious logic, hidden upgrade paths, or phishing behavior. Validation doesn’t guarantee safety — but skipping it removes your first line of defence.

## Contract Lifecycle

<a id="contract-certificate"></a>

### What is a contract certificate and why does it matter?

Each Internet Identity Sale Contract is issued a certificate with a fixed expiration timestamp at deployment. The certificate records deployment metadata, including the template used and the certificate validity period.

The contract logic uses this validity period to restrict controller changes and code upgrades. While the certificate is valid, the contract’s behavior cannot be modified.

Once the certificate expires, the contract no longer passes Hub validation and cannot be used for new Internet Identity sales. At that point, the owner may gain the ability to add a controller and modify the contract.

<a id="safety-window"></a>

### What is a safety window?

The safety window is a fixed period before the certificate expiration. During this period, all sale-related actions in the contract are disabled.

This window is part of the contract logic and creates a buffer between active sales and the moment when the certificate expires. It ensures that no new listings, purchases, or offer acceptances can occur close to the end of the certificate validity period.

### What is a 30-day cooldown?

The 30-day cooldown is a fixed waiting period built into the contract after an Internet Identity is transferred into it.

Internet Identity allows previously authenticated sessions to remain active for up to 30 days, and these sessions cannot be listed or revoked manually. The cooldown period gives these sessions time to expire before the sale can proceed.

After the cooldown ends, the contract rechecks the Internet Identity’s linked NNS assets, including ICP accounts and neurons. If the total amount of ICP across these assets has decreased during the cooldown, the contract blocks further sale actions.

### Can the Cooldown Period be skipped?

No. The cooldown period is enforced by the contract and cannot be skipped.

The contract requires the full cooldown to pass before any sale-related actions can proceed. This behavior is fixed in the contract logic and applies to all sales without exceptions.

## Transferring Internet Identity to the Contract

### Can I transfer only some assets instead of the full identity?

No. The contract always transfers ownership of the entire Internet Identity.

It is not possible to exclude specific assets or permissions from the sale. Everything controlled by the Identity is transferred together as a single unit.

### Which assets are supported?

The contract detects and displays ICP accounts and ICP neurons that were created in the NNS using the Internet Identity being sold.

Other assets, such as SNS tokens, NFTs, or balances held in external dapps, are not displayed in the contract interface. When the Internet Identity is transferred, access to any services or assets that use this Identity for authentication is transferred together with it, even if they are not visible in the contract.

### What about ICP neurons controlled by a hardware wallet?

Neurons whose controller is a hardware wallet are not supported by the contract.

Even if such a neuron is visible in the NNS interface, control over it is tied to the hardware device, not to the Internet Identity itself. Transferring the Internet Identity does not remove access held by the hardware wallet, so full ownership of these neurons cannot be transferred.

If hardware-wallet-controlled neurons are not removed before transferring the Internet Identity into the contract, the buyer will still see them in the NNS. The buyer may gain the level of access granted by hotkeys, such as voting, changing follow relationships, or submitting NNS proposals. These actions can be abused and may deplete the neuron’s ICP.

For this reason, hardware-wallet-controlled neurons must be removed before transferring the Internet Identity into the contract.

### Can I reuse the same contract for a different Internet Identity?

No. An Internet Identity Sale Contract can be used with only one Internet Identity.

Once an Internet Identity is transferred into the contract, no other Identity can ever be transferred into that contract — even if the original Identity is later transferred back out. The contract is permanently bound to the first Identity it receives.

### Will I lose access to dApps and assets linked to the Identity?

Yes. After you transfer your Internet Identity into the contract, you no longer control that Identity.

Access to dapps, wallets, and services that use this Identity for authentication is lost once existing sessions expire. Some sessions may remain active for a limited time, depending on how the service handles Internet Identity logins.

If the Identity is sold, the buyer receives control over the Identity and, with it, access to any services and assets that rely on that Identity for authentication.

### What if I accidentally activated the contract using the same Internet Identity I want to sell?

If the contract is activated using the same Internet Identity that you later try to transfer into it, the transfer will fail at the final step.

Because the transfer does not complete, the contract is not bound to that Identity. You may still be able to start the transfer process again and transfer a different Internet Identity into the contract.

However, the original Identity used for activation cannot be sold using this contract. If you want to sell that Identity, you must deploy and activate a new Internet Identity Sale Contract.

### Why are hotkeys removed during transfer?

When an Internet Identity is transferred into the contract, hotkeys are removed from neurons that are controlled by that Identity in the NNS.

This prevents the previous owner from retaining any access to those neurons after the Identity is sold.

Hotkeys cannot be removed from neurons whose control is tied to a hardware wallet or another external controller. In such cases, the seller must remove those hotkeys manually before transferring the Identity. Otherwise, the buyer will see those neurons and may gain hotkey-level access to them.

### What happens if the contract breaks or the II transfer fails?

If the Internet Identity transfer cannot be completed or some contract functionality becomes unavailable during the certificate period, the contract behavior cannot be changed until the certificate expires.

After the certificate expires, the current contract owner may be able to add a controller and modify the contract. Any recovery or further actions after expiration are performed only by the contract owner.

### Are there any restrictions or unsupported conditions?

Yes. The Internet Identity Sale Contract enforces several restrictions. 

Some conditions permanently block the sale for the current contract. In these cases, the Identity can only be transferred back out, and a new contract must be deployed to attempt another sale:

- If the contract detects unspent ICP allowances on NNS accounts linked to the Identity
- If the number of ICP accounts or neurons exceeds the limits supported by the contract
- If, after the cooldown period, the total amount of ICP across accounts and neurons decreases compared to the initial check
- If the contract enters the safety window or the certificate expires

Some conditions block listing or sale only while they apply:

- If the contract’s cycle balance drops below the Critical Cycle Level defined in the template, sale-related actions are blocked until the contract is topped up

This list is not exhaustive. The full set of conditions, limits, and edge cases is defined by the contract code itself, which should be reviewed before using the contract.

<a id="transfer-to"></a>

### How to Transfer an Internet Identity to the Contract?

After deploying and activating an Internet Identity Sale Contract, the next step is to transfer the Internet Identity you want to sell into the contract. This transfer moves control of the Identity from your device to the contract and allows the sale process to begin.

Before starting the transfer, make sure that the Identity meets all contract requirements. Some conditions may prevent the transfer from completing or permanently block the sale for this contract.

The transfer process consists of four steps:

#### Step 1

- Review the disclaimer shown on the contract page
- Click Start Transfer

#### Step 2

- Open the [Internet Identity website](https://id.ai) in a separate tab
- Sign in using the Internet Identity you want to transfer
- Go to Access Methods → Add new → Continue with passkey → Continue on another device
- A pairing link will be generated (for example, `https://id.ai/pair#ABCDE`)
- Copy the full link
- Do not close or refresh the Internet Identity page
- Return to the contract page
- Paste the link and click Next

#### Step 3

- The contract will display a verification code
- Copy the code
- Return to the Internet Identity page from Step 2
- Paste the code and click Confirm sign-in
- Return to the contract page and click Next

#### Step 4

- Stay on the contract page and wait. No further action is required.

During this final step, the contract performs the transfer and validation process:

- It checks that the Identity being transferred is not the one used to activate the contract
- It removes all other passkeys, auth methods and a seed phrase from the Identity
- If a seed phrase lock is enabled, the transfer will not complete until it is unlocked
- It loads linked ICP accounts and neurons
- It checks for unspent ICP allowances
- It removes neuron hotkeys

This process usually takes a few minutes, but may take longer for Identities with many accounts, neurons, or hotkeys.

### Can I Transfer the Identity from the Contract If I Change My Mind?

Yes. You can transfer the Internet Identity out of the contract as long as no offer has been accepted and no purchase has been completed.

Once the Internet Identity is transferred out, the contract cannot be used again for selling this or any other Identity.

## Selling an Internet Identity

### How to sell an Internet Identity?

After the Internet Identity Sale Contract is deployed and activated, and the Internet Identity is transferred into the contract, the remaining steps are straightforward.

#### 1. Set your payout address

Set a payout address in the contract. This address will receive ICP if the sale is completed. You can change the payout address at any time unless the sale is already in the finalization process.

#### 2. List the Identity for sale

List the Internet Identity by setting a price. You can update the price or remove the listing at any time unless the sale is already in the finalization process. Removing the listing also removes the payout address and any active offers.

#### 3. Wait for buyers

Once listed, the contract may be discovered through external storefronts. Buyers can make offers or purchase the Identity after the cooldown period ends.

If the sale is completed, the contract transfers the proceeds to the payout address automatically.

### What are the Fees?

For this contract, the total fee is 2%. The exact fee parameters are defined by the contract template. A fee is charged only if the sale is completed. 

The fee is distributed between three parties:

- The storefront through which the buyer discovered the contract
- The developer of the contract template
- The GeekFactory Smart Contract Hub

No fees are charged if the Internet Identity is not sold.

### Can I Change the Payout Address?

Yes. You can change the payout address at any time unless the sale is already in the finalization process.

### Can I Change or Cancel the Listing?

Yes. You can update the asking price or cancel the listing at any time unless the sale is already in the finalization process. Removing the listing also removes the payout address and any active offers.

### Can I Remove Offers I Don’t Like?

No. As a seller, you cannot remove or cancel offers submitted by buyers.

If you receive an offer you don’t want to accept, you can simply ignore it. Offers can only be cancelled by the buyers who created them.

### What If No One Buys My Identity?

This is an open, peer-to-peer market. There is no guarantee that a buyer or offer will appear.

If there are no buyers or offers, you have several options. You can keep the Internet Identity listed and wait, adjust the asking price, or cancel the listing.

<a id="risks-seller"></a>

### What are the Risks for the Seller?

Selling an Internet Identity using this contract involves several risks. This list is not exhaustive, and the contract code defines the final behavior in all cases.

#### Loss of access after transfer

Once you transfer your Internet Identity into the contract, you no longer control it. Access to dapps and services linked to that Identity may end immediately or after existing sessions expire. You can regain access only by transferring the Identity back out of the contract, if the sale has not been finalized.

#### Limited time to complete the sale

The sale must complete within the certificate validity period and before the safety window begins. If the contract enters the safety window or the certificate expires before the sale is completed, the contract can no longer be used for listing or selling, and a new contract must be deployed.

#### No upgrades during the certificate period

While the certificate is valid, the contract cannot be upgraded. If a failure or incompatibility occurs during this period, recovery may only be possible after the certificate expires.

#### Single-use contract

Once the Internet Identity is transferred out of the contract, or sold, the contract cannot be reused for another sale.

#### Cooldown delays the payout

The sale follows a fixed cooldown period. This delays when the transaction can complete and when funds are received.

#### No guaranteed visibility

Contracts may be discoverable through third-party storefronts, but visibility is not guaranteed. If no buyer discovers the contract, the Identity may remain unsold.

#### External obligations tied to the Identity

If the Internet Identity was previously used for real-world services or agreements, selling it may lead to disputes or liabilities after the sale.

#### Incorrect payout address

If an incorrect payout address is set, funds sent after a completed sale cannot be recovered.

## Buying an Internet Identity

Buying an Internet Identity through this contract follows a fixed sequence of steps.

#### 1. Find a listing

Internet Identity Sale Contracts can be discovered through external storefronts. These storefronts only index publicly available contract data and do not control the contract itself. Listing details such as price, cooldown, and displayed assets come from the contract.

Before proceeding, always review the contract directly.

#### 2. Validate the contract

Before interacting with the contract, validate it through the GeekFactory Smart Contract Hub. Validation shows whether the contract was deployed via the Hub, which template was used, whether the contract is activated, and whether the certificate is still valid.

Validation does not guarantee that the contract is safe or bug-free. It does not replace reviewing the contract code. You should always inspect the code and understand how the contract behaves before proceeding.

#### 3. Buy or make an offer

Purchases and offers are available only after the cooldown period ends. You can either buy the Internet Identity at the listed price or submit an offer using the OISY wallet. 

Offers are made using APPROVE transactions. When submitting an offer, an ICP allowance is created with an expiration set before the contract’s certificate expires.

Offers are non-binding. If an offer is accepted but sufficient funds are not available at that moment, the transaction does not complete and the offer is removed.

#### 4. Transfer the Identity to your device

After the transaction is completed, you must transfer the Internet Identity from the contract to your device. Once the transfer is complete, the contract no longer has any control over the Identity.

### Can I change or cancel my offer?

Yes. You can cancel an offer or submit a new one at any time unless the sale is already in the finalization process.

### What happens if I make an offer but the seller accepts someone else’s?

If the seller accepts another offer or the Internet Identity is purchased by someone else, your offer has no effect and no action is required from you. Offers are made using APPROVE transactions. If an offer is not accepted, the associated allowance expires automatically. The allowance expiration is set to expire before the contract’s certificate expires.

<a id="risks-buyer"></a>

### What are the risks for the buyer?

Buying an Internet Identity using this contract involves several risks. This list is not exhaustive, and the contract code defines the final behavior in all cases.

#### No upgrades during the certificate period

While the certificate is valid, the contract cannot be upgraded. If a failure or incompatibility occurs during this period, recovery may only be possible after the certificate expires.

#### Single-use contract

After the purchase, the contract can only be used to transfer the Internet Identity to your device. If you later want to resell the Identity, a new contract must be deployed.

#### Storefronts are discovery tools only

Storefronts help you find contracts but do not control their behavior. Listing information may be outdated or misleading, so the contract itself should be reviewed directly.

#### External obligations tied to the Identity

An Internet Identity may have been used with real-world services or agreements. After the purchase, any consequences related to those uses remain with the Identity.

#### Hidden approvals and permissions

The contract checks for unspent ICP allowances only on a limited set of NNS-visible accounts.

Specifically, it scans:

- Manually created ICP accounts visible in the NNS
- The first 10 incremental subaccounts

This means the contract does not cover every possible account layout or every way allowances can be created. If the seller used developer tools and/or custom subaccounts, there may be accounts and approvals that are not detected during the transfer process.

In addition, the contract does not inspect approvals on SNS accounts or on accounts used by other dapps, including ICP accounts outside the NNS interface and assets governed by other token standards.

As a result, after you purchase and transfer the Internet Identity to your device, there may still be allowances or permissions left on accounts that were previously used. If an account you later use has an existing allowance set, the previous owner may still be able to transfer funds from that account according to that allowance.

<a id="transfer-from"></a>

## Transferring Internet Identity to your Device

If you have purchased an Internet Identity, or if the Identity was transferred into the contract but the sale has not been finalized yet, you can transfer the Identity from the contract to your device.

#### Starting the transfer

To start the transfer, open the contract page and click the Transfer to My Device button. The transfer process consists of three steps.

#### Step 1

- Stay on the contract page and wait.
- The contract will enter passkey addition mode.
- No action is required from you at this step.

#### Step 2

- The contract will generate a link
- Click the link to open the Internet Identity page
- A verification code will be shown on that page
- Copy the code
- Do not close or refresh the Internet Identity page
- Return to the contract page, paste the code, and click Next

#### Step 3

- Return to the Internet Identity page you kept open
- Create a new passkey on your device
- After the passkey is added, you will be automatically logged in to the Internet Identity
- At this point, it is recommended to add additional passkeys and/or a recovery (seed) phrase
- Return to the contract page
- Confirm that you have access to the Internet Identity. This action is irreversible!

If the transfer does not complete successfully, you can click Restart Transfer and repeat the process.

### Can I reuse the same contract to resell an Internet Identity?

No. After an Internet Identity is sold, the contract cannot be used for another sale.

If you want to resell an Identity, you must deploy a new Internet Identity Sale Contract.

### What happens if the contract breaks or the II transfer fails?

If the Internet Identity transfer cannot be completed or some contract functionality becomes unavailable during the certificate period, the contract behavior cannot be changed until the certificate expires.

After the certificate expires, the current contract owner may be able to add a controller and modify the contract. Any recovery or further actions after expiration are performed only by the contract owner.

## Cycles and Canister Top-Ups

### Why do cycles matter?

Every Internet Identity Sale Contract runs as a standalone canister on the Internet Computer and requires cycles to operate.

Cycles are consumed by contract actions such as loading accounts and neurons, transferring the Internet Identity, processing offers, and finalizing a sale. If the contract runs out of cycles, it may stop responding and eventually lose its state.

If this happens while the Internet Identity is still inside the contract, the Identity will no longer be recoverable.

### How are cycles consumed?

All operations performed by the contract consume cycles.
The most cycle-intensive operations include:

- Removing passkeys when transferring an Internet Identity into the contract
- Removing hotkeys from neurons
- Loading and checking ICP accounts and neurons (including legacy neurons that may no longer appear in the NNS interface)

Identities with many accounts, neurons, or long staking history may require significantly more cycles to process, which can require a contract top-up.

### Cycle thresholds

The contract monitors its remaining cycle balance.

When the balance falls below the Critical Cycle Level defined by the contract template, sale-related actions are temporarily blocked. This includes listing the Identity, making or accepting offers, and finalizing a purchase.

To continue operating, the contract must be topped up with additional cycles.

<a id="top-up"></a>

### How to top up the contract

The Internet Identity Sale Contract does not include a built-in interface for topping up cycles.
To top up the contract, you need to send additional cycles to the contract canister using an external tool that supports cycle transfers. One commonly used option is [ICPTopUp](https://icptopup.com), but any compatible wallet or developer tool can be used.

### What happens if the contract is not topped up?

If the contract’s cycle balance becomes too low, it will eventually stop processing new requests.

If cycles are not added in time and the balance continues to drop, the contract may stop functioning entirely and lose its internal state.

If this happens while the Internet Identity is still held by the contract, the Identity may no longer be recoverable.

### Can leftover cycles be recovered?

Yes. After the Internet Identity is transferred out and the certificate expires, the contract owner can add a controller and withdraw any remaining cycles. This currently requires developer tools, as there is no user-facing interface for cycle recovery.

## Ecosystem

### How can third-party services interact with this contract?

Contracts deployed through the Hub are public on-chain canisters. As a result, third-party services may build tools such as storefronts, indexers, explorers, or analytics interfaces that read contract data and help users discover listings.

These services do not control the contract and cannot modify its behavior. All sale logic, ownership transfer, and payment processing are defined and executed entirely by the contract code.

### What are storefronts and can I trust them?

Storefronts are third-party interfaces that help users discover Internet Identity Sale Contracts by indexing publicly available contract data.

Storefronts do not deploy contracts and do not control their behavior. They provide a way to find and navigate to contracts, but all sale logic is executed by the contract itself.

Storefronts should not be relied on as a source of trust. To understand how a sale behaves, the contract must be validated through the GeekFactory Smart Contract Hub, and the contract code should be reviewed directly.

### How does the referral model work?

The contract supports a referral model as part of its fee distribution.

Storefronts, indexers, or other third-party services may use referral links when directing users to a specific contract. This creates an additional way to distribute listings and allows participants in the ecosystem to earn a portion of the sale fee.

Referral registration and management are handled outside of this contract and are not part of its core sale mechanism.
