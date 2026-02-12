import type {ReactNode} from 'react';
import {buildPairURL} from './components/pages/identity/state/activated/waitingStartCapture/owner/registrationIdUtils';
import {MIN_PRICE_ICP_INCLUSIVE} from './constants';
import {wrapWithPrefix} from './utils/core/i18/prefix';

const rawI18 = {
    common: {
        button: {
            cancelButton: 'Cancel',
            closeButton: 'Close',
            confirmButton: 'Confirm',
            retryButton: 'Retry'
        },
        error: {
            unableTo: 'Something went wrong.',
            processingError: 'Something went wrong. Retrying automatically...',
            certificateExpirationImminent: 'Certificate is about to expire',
            inputInvalidAccount: 'Account is not valid',
            inputInvalidPrincipal: 'Principal is not valid',
            insufficientBalance: 'This wallet has an insufficient balance.',
            keyValueFailedToLoad: 'Failed to load',
            valueFailedToLoadShort: 'Error!',
            metadataError: 'Unable to load ICRC transaction fee.',
            inputInvalidURL: 'URL is not valid'
        },
        yes: 'Yes',
        no: 'No',
        loading: 'Loading...'
    },
    auth: {
        connect: {
            confirmationModal: {
                title: 'Connect to Contract',
                description: 'Review and confirm the following before connecting.',
                agreementCheckbox: {
                    termsOfUse: {
                        part1: 'I have read and agree to the',
                        termsOfUse: 'Terms of Use'
                    },
                    faq: {
                        part1: 'I have read the ',
                        part2: 'official FAQ'
                    },
                    risks: {
                        part1: 'I understand exactly what I am doing and what could go wrong, take full responsibility and accept all ',
                        part2: 'risks'
                    },
                    validation: {
                        part1: 'I validated this contract on ',
                        part2: 'GeekFactory Hub'
                    }
                },
                button: 'Connect with Internet Identity'
            },
            connectButton: 'Connect'
        },
        disconnect: {
            confirmationModal: {
                title: 'Disconnect',
                description: 'Do you want to disconnect?',
                button: 'Disconnect'
            },
            disconnectButton: 'Disconnect'
        }
    },
    toolbar: {
        title: {
            first: 'INTERNET IDENTITY',
            second: 'SALE CONTRACT v1.0'
        },
        menu: {
            home: 'Home',
            status: 'Status',
            about: 'About',
            settings: 'Danger Zone',
            darkMode: 'Dark Mode',
            termsOfUse: 'Terms of Use',
            sourceCode: 'Source Code',
            faq: 'FAQ'
        }
    },
    banner: {
        expired: {
            title: 'CONTRACT CERTIFICATE EXPIRED',
            description: 'The sale is no longer allowed.'
        },
        unsellable: {
            title: 'CONTRACT CERTIFICATE WILL EXPIRE SOON',
            description: 'The sale is no longer allowed.'
        },
        willExpireSoon: {
            title: 'CONTRACT WILL ENTER SAFETY WINDOW SOON',
            description: (duration: string) => `Only ${duration} remain to complete the sale.`,
            descriptionSoon: 'Less than a second remain to complete the sale.'
        },
        cyclesTooLow: {
            title: 'CONTRACT WILL RUN OUT OF CYCLES SOON',
            description: 'Top the contract canister up to prevent it from stopping.'
        },
        validate: {
            title: 'VALIDATE CONTRACT',
            description: 'To avoid phishing attempts, always validate the contract URL on the GeekFactory Hub before connecting.'
        },
        contractBlocked: {
            title: 'CONTRACT TEMPLATE IS BLOCKED',
            description: 'This contract can no longer be trusted for secure operations.'
        }
    },
    contractCanisterId: {
        stub: {
            loading: {
                title: 'Loading contract details...'
            },
            error: {
                title: 'Unable to load contract ID.'
            }
        }
    },
    contract: {
        activation: {
            notActivated: {
                panelTitle: 'Activate Contract',
                stub: {
                    validationError: 'This activation code is not valid.'
                },
                description: 'Enter the contract activation code.',
                warning: 'Check that you are NOT connected with the Internet Identity you plan to sell. Otherwise, disconnect now and connect with another Internet Identity.',
                form: {
                    codeInputLabel: 'Activation Code',
                    codeInputPlaceholder: 'abc123xyz456def789ghi000',
                    button: 'Activate Contract'
                },
                anonymous: {
                    title: 'CHECK BEFORE CONNECTING',
                    description: 'Do not use the Internet Identity you plan to sell to activate this contract.'
                }
            }
        }
    },
    status: {
        tabs: {
            simple: 'Simple',
            advanced: 'Advanced'
        },
        simple: {
            panelTitle: 'Status'
        },
        processingError: {
            panelTitle: 'Error Detected',
            panelDescription: 'Something went wrong while processing the last operation.',
            viewLink: 'View Details'
        },
        canisterStatus: {
            panelTitle: 'Contract Canister Status',
            canisterId: 'Canister ID',
            cycles: 'Cycles',
            memory: 'Memory',
            idleCyclesBurnedPerDay: 'Idle Cycles Burned Per Day',
            reservedCycles: 'Reserved Cycles',
            requestPayloadTotal: 'Request Payload Total',
            responsePayloadTotal: 'Response Payload Total',
            numberOfCalls: 'Number of Calls Total',
            numberOfInstructions: 'Number of Instructions Total',
            logVisibility: {
                label: 'Log Visibility',
                public: 'Public',
                controllers: 'Controllers',
                allowedViewers: 'Allowed Viewers:'
            },
            controllers: 'Controllers',
            noControllers: 'No controllers',
            moduleHash: 'Module Hash',
            noModuleHash: 'No module hash',
            subnetId: 'Subnet'
        },
        certificate: {
            panelTitle: 'Certificate Details',
            expirationDate: 'Certificate Expiration Date',
            expirationDateLabel: {
                label: (duration: string) => `${duration} left`,
                soon: 'less than a second left'
            },
            expirationDateExpiredWarning: 'Expired',
            contractCanisterId: 'Contract Canister ID',
            hubCanisterId: 'Hub Canister ID',
            deployedBy: 'Deployed By',
            contractWasmHash: 'Contract WASM Hash'
        },
        contractEvents: {
            panelTitle: 'Contract Events',
            panelDescription: 'A technical log of contract events, mainly intended for debugging or advanced troubleshooting.',
            stub: {
                loading: 'Loading contract events...',
                empty: 'No contract events'
            },
            table: {
                created: 'Created',
                event: 'Event',
                stub: {
                    unknownEvent: '-'
                }
            }
        },
        loggerEvents: {
            panelTitle: 'Browser Events',
            panelDescription: 'A technical log of browser events, mainly intended for debugging or advanced troubleshooting.',
            stub: {
                loading: 'Loading browser events...',
                empty: 'No browser events'
            },
            export: 'Export',
            table: {
                level: 'Level',
                prefix: 'Prefix',
                uid: 'UID',
                message: 'Message',
                created: 'Created'
            }
        }
    },
    settings: {
        danger: {
            panelTitle: 'Danger Zone',
            panelSubtitle: 'These operations are irreversible and should only be used if you fully understand the consequences!',
            cancelSaleIntention: {
                button: 'Remove Listing'
            },
            startRelease: {
                button: 'Transfer to Device'
            },
            addController: {
                button: 'Add Controller',
                modal: {
                    title: 'Add Controller',
                    description: 'Enter the Principal you want to add as a controller to this canister.',
                    warning: {
                        part1: 'This action is only allowed after the contract certificate expires.',
                        part2: 'The principal you add will gain full control over the canister, including the ability to upgrade its code.'
                    },
                    principal: {
                        label: 'Controller',
                        placeholder: 'Principal'
                    },
                    button: 'Add',
                    stub: {
                        notExpired: 'Unable to add the controller until the contract certificate expires.',
                        success: `The controller has been successfully added to this contract canister.`,
                        delay: (duration: string) => `Unable to add controller. The contract is currently finalising operations. This may take up to ${duration}. Retry later.`,
                        notEnoughCycles: `Unable to add controller. Not enough cycles in this contract. Top up and retry.`
                    }
                }
            }
        }
    },
    about: {
        panelTitle: 'About',
        description: `This single-use smart contract enables trustless sale of an entire Internet Identity along with all linked assets, accounts, permissions, and dapp accesses. It provides key functionality like listing, offers, validation, ownership transfer, and payments. The contract is issued with a cryptographic certificate, which makes it fully immutable for the entire certification period.

KEY PARAMETERS

- Certificate Length: 100 days
- Cooldown Period: 30 days
- Safety Window: 10 days 
- Max Accounts Allowed: 1000
- Max Neurons Allowed: 1000
- Min Price: 1 ICP
- Initial Cycles: 5T
- Critical Cycle Threshold: 0.7T
- Canister Freezing Threshold: 90 days

FEATURES

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

LIMITATIONS

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

FEES

This contract applies 2% fee upon successful sale:

- 1% to referrer
- 0.5% to contract developer
- 0.5% to GEEKFACTORY

IMPORTANT NOTES AND RISKS

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

DISCLAIMER

This contract is provided as-is and used entirely at your own risk.

Interactions involve technical, operational, protocol, and market risks and may fail or result in partial or total loss of access, assets, or funds. Sales are not guaranteed, and all transactions are final and irreversible.

This description does not cover all possible risks, limitations, or edge cases. Actual contract logic, operations and limitations are defined solely by source code that is open and available for review.`
    },
    contractCertificate: {
        stub: {
            error: {
                title: 'Unable to load contract certificate.'
            }
        }
    },
    holder: {
        stub: {
            loading: {
                title: 'Loading contract details...'
            },
            error: {
                title: 'Unable to load contract.'
            }
        },
        state: {
            common: {
                steps: (current: number, total: number) => `Step ${current} of ${total}`,
                fetchingAssets: {
                    finalizingTransfer: {
                        description: 'Transferring Internet Identity and fetching assets...',
                        warning: 'DO NOT CLOSE THIS PAGE UNTIL TRANSFER IS COMPLETE!',
                        pageStub: 'Fetching assets...'
                    },
                    refetching: {
                        description: 'The cooldown period has ended. Validating assets...',
                        warning: 'DO NOT CLOSE THIS PAGE UNTIL VALIDATION IS COMPLETE!',
                        pageStub: 'Validating assets...'
                    }
                },
                notActivated: 'Contract Not Activated',
                contractEmpty: 'Contract Activated',
                processing: 'Executing operations...',
                acceptDeal: 'Finalizing the sale...',
                transferring: 'Transferring Internet Identity...'
            },
            capture: {
                common: {
                    panelTitle: (identityNumber: number) => `Transfer #${identityNumber} to Contract`,
                    actionButton: {
                        restartTransfer: 'Restart Transfer'
                    },
                    modal: {
                        restartTransfer: {
                            title: 'Restart Transfer',
                            description: 'Do you want to restart?',
                            warning: 'All progress will be lost and you will go to the beginning.',
                            button: 'Restart'
                        }
                    }
                },
                waitingStartCaptureDisclaimer: {
                    description: 'Read this before you start.',
                    warning:
                        'After your Internet Identity is transferred into this contract, you will lose access to all linked dapps and assets. This includes, but is not limited to, NNS accounts, neurons, wallets, social apps, and any canisters controlled by the identity. Until the Internet Identity is sold, you can still transfer it back to your device and regain access. Once the sale is complete, the buyer gains full access to all linked dapps and assets.',
                    button: 'Start Transfer'
                },
                waitingStartCapture: {
                    panelTitle: 'Transfer Internet Identity to Contract',
                    description: {
                        part1: 'Log in to the ',
                        link: 'Internet Identity website',
                        part3: '  with the Internet Identity you want to sell. Go to Access Methods and follow steps of adding a new passkey on another device. Copy the URL shown on the last step, and paste it below.'
                    },
                    warning: 'Do not close or refresh any pages on the Internet Identity website until the transfer process is complete.',
                    form: {
                        pairUrl: {
                            label: 'URL',
                            placeholder: buildPairURL('aBcDe')
                        }
                    },
                    stub: {
                        error: {
                            invalidRegistrationId: 'URL is not valid or expired.'
                        }
                    },
                    button: 'Next'
                },
                captureError: {
                    stub: {
                        sessionRegistrationModeExpired: 'The passkey registration has expired. Click Restart Transfer below.',
                        sessionRegistrationModeOff: 'The passkey registration has been cancelled. Click Restart Transfer below.',
                        sessionRegistrationAlreadyInProgress: 'Something went wrong. Click Restart Transfer below.',
                        holderAuthnMethodRegistrationModeOff: 'Something went wrong. Click Restart Transfer below.',
                        invalidMetadata: 'Something went wrong. Click Restart Transfer below.',
                        holderAuthnMethodRegistrationUnauthorized: 'The verification code has not been confirmed. Click Restart Transfer below.',
                        holderDeviceLost: 'This contract has been removed from the Internet Identity passkey list. Click Restart Transfer below.'
                    }
                },
                NeedConfirmAuthnMethodSessionRegistration: {
                    description: 'Copy the verification code below, and return to the Internet Identity website. Enter and confirm this code there, then come back here and click Next.',
                    expiredWarning: 'Transfer will restart in a few seconds...',
                    form: {
                        verificationCode: {
                            label: 'Verification Code',
                            expiresIn: 'Expires in',
                            expired: 'Expired'
                        },
                        agreementCheckbox: 'I have confirmed the verification code.'
                    },
                    button: 'Next'
                },
                needDeleteProtectedIdentityAuthnMethod: {
                    description1: 'One or more recovery methods are locked. To proceed, unlock them by following these ',
                    descriptionLinkToInstructions: 'instructions',
                    description2: ' and retry.'
                },
                finalizingCapture: {
                    verifyingInternetIdentity: 'Verifying Internet Identity',
                    removingPasskeys: {
                        simple: 'Removing passkeys',
                        detailed: (passkeysLeft: number) => `(${passkeysLeft} ${passkeysLeft == 1 ? 'passkey' : 'passkeys'} left)`
                    }
                }
            },
            holding: {
                common: {
                    panelTitle: (identityNumber: number) => `#${identityNumber}`,
                    panelSubtitle: (identityName: string | null) => `Identity Name: ${identityName}`,
                    topPanel: {
                        lastUpdated: (date: string) => `Last updated: ${date}`,
                        saleStatus: {
                            notListed: 'Not Listed for Sale',
                            listed: 'Listed for Sale',
                            sold: 'Sold',
                            purchased: 'Purchased',
                            transferredToDevice: 'Transferred to Device',
                            notSold: 'Not Sold',
                            saleNotAllowed: 'Sale Not Allowed'
                        },
                        cooldownStatus: {
                            active: 'Cooldown Active',
                            ended: 'Cooldown Ended'
                        },
                        stats: {
                            totalValue: 'Total Value',
                            lockedValue: 'Neurons',
                            avgAge: {
                                title: 'Weighted Age',
                                noValue: '-',
                                smallValue: '0 seconds'
                            },
                            avgDelay: {
                                title: 'Weighted Delay',
                                noValue: '-',
                                smallValue: '0 seconds'
                            },
                            badValue: 'No Data'
                        },
                        completedSaleDealPrice: {
                            other: 'Sold for',
                            buyer: 'Purchased for'
                        },
                        price: {
                            owner: {
                                title: 'Price',
                                notSet: 'Not Set'
                            },
                            guest: {
                                title: 'Price'
                            },
                            noDiscount: 'equal to total value',
                            fromTotalValue: `from total value`
                        },
                        offer: {
                            title: 'Your Offer'
                        },
                        action: {
                            owner: {
                                sell: 'List for Sale',
                                editListing: 'Edit Listing',
                                setPayoutAddress: 'Set Payout Address',
                                changePayoutAddress: 'Change Payout Address',
                                transferToMyDevice: 'Transfer to Device'
                            },
                            guest: {
                                buy: 'Buy',
                                makeOffer: 'Make Offer',
                                editOffer: 'Edit Offer'
                            }
                        },
                        completedSaleDealStatus: {
                            seller: {
                                part1: 'You successfully sold this Internet Identity and received ',
                                part2: ' after fees to the payout address.'
                            },
                            buyer: {
                                part1: `You successfully purchased this Internet Identity`,
                                part2: {
                                    closed: ', and transferred it to your device.',
                                    notClosed: '.'
                                }
                            }
                        },
                        cooldown: {
                            cooldownDurationLabel: (duration: string) => `${duration}`,
                            cooldownActiveSoon: 'a moment',
                            owner: {
                                cooldownWithoutPrice: (duration: ReactNode) => (
                                    <>
                                        Cooldown period ends in {duration}. You may set your desired price now, but buyers will be able to make offers or purchase this Internet Identity only after the
                                        cooldown ends.
                                    </>
                                ),
                                cooldownWithPrice: (duration: ReactNode) => (
                                    <>Cooldown period ends in {duration}. Buyers will be able to make offers or purchase this Internet Identity only after the cooldown ends.</>
                                ),
                                withoutPrice: 'Cooldown has ended, but buyers will be able to make offers or purchase this Internet Identity only after a price is set.'
                            },
                            guest: {
                                cooldownWithoutPrice: (duration: ReactNode) => (
                                    <>Cooldown period ends in {duration}. You will be able to make an offer or purchase this Internet Identity only after the cooldown ends and a price is set.</>
                                ),
                                cooldownWithPrice: (duration: ReactNode) => (
                                    <>Cooldown period ends in {duration}. You will be able to make an offer or purchase this Internet Identity only after the cooldown ends.</>
                                ),
                                withoutPrice: 'Cooldown has ended, but you will be able to make an offer or purchase this Internet Identity only after a price is set.'
                            }
                        },
                        address: {
                            sellerLabel: `Payout Address`,
                            sellerNotSet: `Not Set`,
                            paymentLabel: `Payment Address`
                        }
                    },
                    accounts: {
                        title: 'Accounts',
                        stub: {
                            empty: 'No accounts'
                        },
                        main: {
                            title: 'Main Account'
                        }
                    },
                    neurons: {
                        title: 'Neurons',
                        age: {
                            label: (age: string) => `${age}`,
                            tooLow: 'less than a second old'
                        },
                        dissolveDelay: {
                            tooLow: 'less than a second',
                            dissolving: (duration: string) => `(${duration})`,
                            locked: (duration: string) => `(${duration})`
                        },
                        state: {
                            locked: 'Locked',
                            dissolving: 'Dissolving',
                            spawning: 'Spawning',
                            dissolved: 'Unlocked'
                        },
                        stub: {
                            empty: 'No neurons'
                        },
                        viewDetails: 'View Details',
                        modal: {
                            title: (neuronId: string) => `${neuronId}`,
                            lastUpdated: (date: string) => `Last updated: ${date}`,
                            created: 'Created',
                            neuronState: 'Neuron State',
                            dissolveDelay: 'Dissolve Delay',
                            remaining: 'Remaining',
                            age: 'Age',
                            agingSince: 'Aging Since',
                            total: 'Total',
                            cachedNeuronStake: 'Cached Neuron Stake',
                            stakedMaturityEquivalent: 'Staked Maturity Equivalent',
                            maturityEquivalent: 'Maturity Equivalent',
                            neuronFees: 'Neuron Fees',
                            autoStakeMaturity: 'Auto Stake Maturity',
                            potentialVotingPower: 'Potential Voting Power',
                            decidingVotingPower: 'Deciding Voting Power',
                            votingPowerRefreshedAt: 'Voting Power Refreshed At',
                            neuronType: {
                                title: 'Neuron Type',
                                ect: 'Early Contributor Token (ECT)',
                                seed: 'Seed'
                            },
                            kycVerified: 'KYC Verified',
                            nonForProfit: 'Not for Profit',
                            knownNeuronName: 'Known Neuron Name',
                            joinedCommunityFund: 'Joined Community Fund',
                            visibility: {
                                title: 'Visibility',
                                private: 'Private',
                                public: 'Public',
                                unspecified: 'Unspecified'
                            },
                            controller: 'Controller',
                            account: 'Account',
                            common: {
                                unspecified: 'Unspecified',
                                nonApplicable: '-'
                            }
                        }
                    },
                    offers: {
                        title: 'Offers',
                        duration: {
                            ago: (duration: string) => `${duration} ago`,
                            justNow: 'just now'
                        },
                        stub: {
                            empty: 'No offers'
                        },
                        acceptButton: 'Accept'
                    }
                },
                modal: {
                    setSaleIntention: {
                        choosingAccountSource: {
                            description: 'Provide the wallet address where you want to receive automatic payout in ICP after this Internet Identity is sold.',
                            oisyButton: 'Get from Oisy Wallet',
                            manualButton: 'Enter Manually'
                        },
                        enter: {
                            description: 'Enter the ICP wallet address below.',
                            payoutAddress: {
                                label: 'Payout Address',
                                placeholder: 'Account or Principal'
                            }
                        },
                        loadingTransactions: {
                            stub: 'Loading account transactions...'
                        },
                        confirm: {
                            description: 'Verify that this is the correct payout address.',
                            walletAddress: 'Payout Address',
                            balance: 'Balance',
                            latestTransactions: {
                                title: 'Latest Transactions',
                                stub: {
                                    empty: 'No transactions found'
                                }
                            },
                            agreementCheckbox: 'I confirm that this is the correct payout address.'
                        },
                        title: {
                            enter: 'Set Payout Address',
                            confirm: 'Confirm Payout Address'
                        }
                    },
                    cancelSaleIntention: {
                        title: 'Remove Listing',
                        description: 'Do you want to remove your listing?',
                        descriptionAsTransferFromContract: 'To start the transfer, you first need to remove your listing. This will also remove your payout address and all current offers.',
                        warning: 'This will remove your payout address and all current offers.',
                        okButton: 'Remove Listing'
                    },
                    setSaleOffer: {
                        title: {
                            set: 'List for Sale',
                            edit: 'Edit Listing'
                        },
                        description: {
                            set: 'Set your price to list this Internet Identity for sale.',
                            edit: 'Update your listing price.'
                        },
                        totalValue: 'Total Value',
                        developerReward: (percentage: string) => `Developer Fee (${percentage})`,
                        referralReward: (percentage: string) => `Referral Fee (${percentage})`,
                        hubReward: (percentage: string) => `GeekFactory Fee (${percentage})`,
                        totalReward: (percentage: string) => `Fees (${percentage})`,
                        youWillReceive: 'You Will Receive',
                        price: {
                            label: 'Price',
                            placeholder: '0.00',
                            error: {
                                tooLow: `Price cannot be lower than ${MIN_PRICE_ICP_INCLUSIVE} ICP`,
                                inputInvalidPrice: 'Price is not valid'
                            }
                        },
                        setButton: 'List for Sale',
                        editButton: 'Update Listing',
                        removeButton: 'Remove Listing',
                        stub: {
                            error: {
                                higherBuyerOfferExists: 'Price cannot be equal or lower than an existing offer.'
                            }
                        }
                    },
                    buyNowOrMakeBuyerOffer: {
                        price: {
                            label: 'Price'
                        },
                        estimates: {
                            transactionFee: 'Transaction Fee'
                        }
                    },
                    buyNow: {
                        title: 'Buy',
                        description: 'Purchase this Internet Identity at the listed price.',
                        buyButton: 'Buy',
                        estimates: {
                            youWillSpend: 'You Will Spend'
                        },
                        stub: {
                            error: {
                                priceMismatch: 'The price has changed!'
                            }
                        }
                    },
                    makeOffer: {
                        title: {
                            set: 'Make Offer',
                            edit: 'Edit Offer'
                        },
                        description: {
                            set: 'Propose your own price for this Internet Identity.',
                            edit: 'Update your offer details.'
                        },
                        offerAmount: {
                            label: 'Offer',
                            placeholder: '0.00',
                            error: {
                                inputOfferTooLow: `Offer cannot be lower than ${MIN_PRICE_ICP_INCLUSIVE} ICP`,
                                inputInvalidOffer: 'Offer is not valid'
                            }
                        },
                        nonBindingOfferWarning: 'This offer is non-binding. The offer amount will be charged if accepted by the seller. Only the transaction fee will be paid now.',
                        setButton: 'Submit Offer',
                        editButton: 'Update Offer',
                        removeOffer: 'Remove Offer',
                        stub: {
                            error: {
                                offerAmountExceedsPrice: 'Offer cannot be equal or higher than the listing price.'
                            }
                        }
                    },
                    cancelBuyerOffer: {
                        title: 'Remove Offer',
                        description: 'Do you want to remove your offer?',
                        okButton: 'Remove Offer'
                    },
                    acceptOffer: {
                        title: 'Accept Offer',
                        description: 'Review and confirm this offer to complete the sale.',
                        offer: 'Offer',
                        betterOfferWarning: {
                            description: 'You have a better offer! If you still want to accept this offer, click Confirm below.',
                            button: 'Confirm'
                        },
                        button: 'Accept Offer',
                        stub: {
                            error: {
                                offerRemoved: 'This offer has been removed and is no longer available.',
                                offerChanged: 'This offer has changed!'
                            }
                        }
                    }
                },
                fetchingAssets: {
                    connectingToNNS: 'Connecting to NNS',
                    fetchingNeurons: {
                        simple: 'Fetching neurons',
                        detailed: (neuronsLeft: number) => `(${neuronsLeft} ${neuronsLeft == 1 ? 'neuron' : 'neurons'} left)`
                    },
                    removingHotkeys: {
                        simple: 'Removing hotkeys',
                        detailed: (hotkeysLeft: number) => `(${hotkeysLeft} ${hotkeysLeft == 1 ? 'hotkey' : 'hotkeys'} left)`
                    },
                    fetchingAccounts: {
                        simple: 'Fetching accounts',
                        detailed: (accountsLeft: number) => `(${accountsLeft} ${accountsLeft == 1 ? 'account' : 'accounts'} left)`
                    },
                    checkingForUnspentAllowances: {
                        simple: 'Checking for unspent allowances',
                        detailed: (accountsLeft: number) => `(${accountsLeft} ${accountsLeft == 1 ? 'account' : 'accounts'} left)`
                    },
                    validatingAssets: 'Validating assets'
                },
                startRelease: {
                    description: 'Do you want to transfer this Internet Identity to your device?',
                    warning: 'THIS CANNOT BE STOPPED ONCE STARTED! After the transfer is complete, you will not be able to use this contract to sell this or any other Internet Identity.',
                    button: 'Start Transfer'
                },
                unsellable: {
                    reason: {
                        certificateExpired: 'Sale operations are no longer allowed because the contract certificate is nearing expiration or has expired.',
                        validationFailed: 'Sale operations are no longer allowed because a decrease in total value has been detected.',
                        checkLimitAccountsFailed: (max: number) => `Sale operations are no longer allowed because more than ${max} accounts have been detected.`,
                        checkLimitNeuronsFailed: (max: number) => `Sale operations are no longer allowed because more than ${max} neurons have been detected.`,
                        approveOnAccount: 'Sale operations are no longer allowed because an unspent allowance has been detected on at least one of the linked NNS accounts.'
                    }
                }
            },
            release: {
                common: {
                    panelTitle: (identityNumber: number) => `Transfer #${identityNumber} to Device`,
                    actionButton: {
                        restartTransfer: 'Restart Transfer'
                    },
                    modal: {
                        restartTransfer: {
                            title: 'Restart Transfer',
                            description: 'Do you want to restart?',
                            warning: 'All progress will be lost and you will go to the beginning.',
                            button: 'Restart'
                        }
                    }
                },
                startRelease: {
                    stub: {
                        loading: 'Starting transfer process...'
                    }
                },
                enterAuthnMethodRegistrationModeFail: {
                    form: {
                        registrationId: {
                            label: 'Registration ID',
                            placeholder: 'aBcDe'
                        }
                    }
                },
                waitingAuthnMethodRegistration: {
                    description: 'Follow the steps below to complete the transfer.',
                    warning: 'Do not close or refresh any pages on the Internet Identity website until the transfer process is complete.',
                    steps: {
                        openLink: 'Click the link below to get the verification code',
                        enterCode: 'Enter the verification code here',
                        clickNext: 'Click Next to continue'
                    },
                    form: {
                        verificationCode: {
                            placeholder: '123456'
                        }
                    },
                    stub: {
                        authnMethodRegistrationWrongCode: 'This verification code is not valid.'
                    },
                    button: 'Next'
                },
                checkingAccessFromOwnerAuthnMethod: {
                    description: {
                        nameEmpty: `Return to the Internet Identity website to create a new passkey for this Internet Identity. If you are able to access it, click Confirm.`,
                        name: {
                            part1: `Return to the Internet Identity website to create a new passkey for the Internet Identity`,
                            part2: (identityName: string) => ` named "${identityName}". `,
                            part3: `If you are able to access it, click Confirm.`
                        }
                    },
                    warning:
                        'After you click Confirm, this contract will be removed from your Internet Identity passkey list. If you confirm without access to your Internet Identity, you will permanently lose it.',
                    warningUndone: 'THIS CANNOT BE UNDONE!',
                    hint: 'Consider creating multiple access methods to secure this Internet Identity before confirming.',
                    form: {
                        agreementCheckbox: 'I confirm that I am able to access this Internet Identity.'
                    }
                },
                dangerousToLoseIdentity: {
                    description:
                        'This contract has been activated using the same Internet Identity you are now trying to transfer. As a result, selling this Internet Identity in this contract is no longer possible. To sell another Internet Identity, restart the transfer process. Otherwise, deploy a new contract.',
                    button: 'Restart Transfer'
                },
                identityAPIChanged: {
                    description:
                        'Due to significant changes in Internet Identity API, the transfer cannot be completed, and the use of this contract is no longer allowed. Click Terminate Transfer below to remove this contract from your Internet Identity passkey list.',
                    button: 'Terminate Transfer'
                },
                releaseError: {
                    stub: {
                        holderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered: 'You have not added a passkey. Click Restart Transfer below.',
                        authnMethodRegistrationModeEnterAlreadyInProgress: 'Something went wrong. Click Restart Transfer below.',
                        authnMethodRegistrationModeEnterInvalidRegistrationId: 'The format of the passkey registration ID has changed. Enter new registration ID, and click Restart Transfer below.',
                        authnMethodRegistrationExpired: 'The passkey registration has expired. Click Restart Transfer below.'
                    }
                }
            },
            closed: {
                description: {
                    owner: 'This Internet Identity was not sold and has been transferred to your device. The contract is closed.',
                    guest: 'This Internet Identity was not sold and has been transferred out of this contract. The contract is closed.'
                }
            }
        }
    },
    footer: `Sale Contract deployed with GeekFactory`
};

export const i18 = wrapWithPrefix(rawI18);
