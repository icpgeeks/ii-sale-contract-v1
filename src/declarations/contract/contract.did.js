export const idlFactory = ({ IDL }) => {
  const FetchAssetsState = IDL.Rec();
  const HoldingState = IDL.Rec();
  const ContractCertificate = IDL.Record({
    'deployer' : IDL.Principal,
    'contract_canister' : IDL.Principal,
    'hub_canister' : IDL.Principal,
    'contract_wasm_hash' : IDL.Text,
    'expiration' : IDL.Nat64,
    'contract_template_id' : IDL.Nat64,
  });
  const SignedContractCertificate = IDL.Record({
    'signature' : IDL.Vec(IDL.Nat8),
    'contract_certificate' : ContractCertificate,
  });
  const InitContractArgs = IDL.Record({
    'certificate' : SignedContractCertificate,
    'contract_activation_code_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'root_public_key_raw' : IDL.Vec(IDL.Nat8),
  });
  const AcceptBuyerOfferArgs = IDL.Record({
    'offer_amount' : IDL.Nat64,
    'check_higher_offer' : IDL.Bool,
    'buyer' : IDL.Principal,
  });
  const NeuronInformationExtended = IDL.Record({
    'dissolve_delay_seconds' : IDL.Nat64,
    'state' : IDL.Int32,
    'age_seconds' : IDL.Nat64,
  });
  const NeuronInformation = IDL.Record({
    'staked_maturity_e8s_equivalent' : IDL.Opt(IDL.Nat64),
    'controller' : IDL.Opt(IDL.Principal),
    'voting_power_refreshed_timestamp_seconds' : IDL.Opt(IDL.Nat64),
    'kyc_verified' : IDL.Bool,
    'potential_voting_power' : IDL.Opt(IDL.Nat64),
    'neuron_type' : IDL.Opt(IDL.Int32),
    'not_for_profit' : IDL.Bool,
    'maturity_e8s_equivalent' : IDL.Nat64,
    'deciding_voting_power' : IDL.Opt(IDL.Nat64),
    'cached_neuron_stake_e8s' : IDL.Nat64,
    'created_timestamp_seconds' : IDL.Nat64,
    'auto_stake_maturity' : IDL.Opt(IDL.Bool),
    'aging_since_timestamp_seconds' : IDL.Nat64,
    'account' : IDL.Vec(IDL.Nat8),
    'joined_community_fund_timestamp_seconds' : IDL.Opt(IDL.Nat64),
    'neuron_information_extended' : IDL.Opt(NeuronInformationExtended),
    'neuron_fees_e8s' : IDL.Nat64,
    'visibility' : IDL.Opt(IDL.Int32),
    'known_neuron_name' : IDL.Opt(IDL.Text),
  });
  const Timestamped = IDL.Record({
    'value' : NeuronInformation,
    'timestamp' : IDL.Nat64,
  });
  const NeuronAsset = IDL.Record({
    'info' : IDL.Opt(Timestamped),
    'neuron_id' : IDL.Nat64,
  });
  const Timestamped_1 = IDL.Record({
    'value' : IDL.Vec(NeuronAsset),
    'timestamp' : IDL.Nat64,
  });
  const Timestamped_2 = IDL.Record({
    'value' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
  });
  const AccountInformation = IDL.Record({
    'balance' : IDL.Opt(Timestamped_2),
    'account_identifier' : IDL.Vec(IDL.Nat8),
  });
  const SubAccountInformation = IDL.Record({
    'sub_account_information' : AccountInformation,
    'name' : IDL.Text,
    'sub_account' : IDL.Vec(IDL.Nat8),
  });
  const AccountsInformation = IDL.Record({
    'principal' : IDL.Principal,
    'main_account_information' : IDL.Opt(AccountInformation),
    'sub_accounts' : IDL.Vec(SubAccountInformation),
  });
  const Timestamped_3 = IDL.Record({
    'value' : IDL.Opt(AccountsInformation),
    'timestamp' : IDL.Nat64,
  });
  const HolderAssets = IDL.Record({
    'controlled_neurons' : IDL.Opt(Timestamped_1),
    'accounts' : IDL.Opt(Timestamped_3),
  });
  const Timestamped_4 = IDL.Record({
    'value' : HolderAssets,
    'timestamp' : IDL.Nat64,
  });
  const LedgerAccount = IDL.Variant({
    'Account' : IDL.Record({
      'owner' : IDL.Principal,
      'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
    'AccountIdentifier' : IDL.Record({ 'slice' : IDL.Vec(IDL.Nat8) }),
  });
  const CompletedSaleDeal = IDL.Record({
    'assets' : Timestamped_4,
    'buyer_account' : LedgerAccount,
    'seller' : IDL.Principal,
    'seller_transfer' : Timestamped_2,
    'buyer' : IDL.Principal,
    'seller_account' : LedgerAccount,
    'price' : IDL.Nat64,
  });
  const BuyerOffer = IDL.Record({
    'referral' : IDL.Opt(IDL.Text),
    'offer_amount' : IDL.Nat64,
    'buyer' : IDL.Principal,
    'approved_account' : LedgerAccount,
  });
  const Timestamped_5 = IDL.Record({
    'value' : BuyerOffer,
    'timestamp' : IDL.Nat64,
  });
  const SaleDeal = IDL.Record({
    'receiver_account' : LedgerAccount,
    'offers' : IDL.Vec(Timestamped_5),
    'sale_price' : IDL.Opt(Timestamped_2),
    'expiration_time' : IDL.Nat64,
  });
  const HolderProcessingError = IDL.Variant({
    'UpdateHolderError' : IDL.Null,
    'IcAgentError' : IDL.Record({
      'error' : IDL.Text,
      'retry_delay' : IDL.Opt(IDL.Nat64),
    }),
    'DelegationExpired' : IDL.Null,
    'InternalError' : IDL.Record({ 'error' : IDL.Text }),
  });
  const Timestamped_6 = IDL.Record({
    'value' : HolderProcessingError,
    'timestamp' : IDL.Nat64,
  });
  const DelayedTimestampMillis = IDL.Record({
    'time' : IDL.Nat64,
    'delay' : IDL.Nat64,
  });
  const ReleaseError = IDL.Variant({
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : IDL.Null,
    'AuthnMethodRegistrationModeEnterAlreadyInProgress' : IDL.Null,
    'AuthnMethodRegistrationModeEnterInvalidRegistrationId' : IDL.Record({
      'error' : IDL.Text,
    }),
    'AuthnMethodRegistrationExpired' : IDL.Null,
  });
  const RestartReleaseIdentityArgs = IDL.Record({
    'registration_id' : IDL.Opt(IDL.Text),
  });
  const ConfirmAuthnMethodRegistrationError = IDL.Record({
    'retries_left' : IDL.Nat8,
    'verification_code' : IDL.Text,
  });
  const ReleaseState = IDL.Variant({
    'DangerousToLoseIdentity' : IDL.Null,
    'IdentityAPIChanged' : IDL.Null,
    'DeleteHolderAuthnMethod' : IDL.Null,
    'StartRelease' : IDL.Null,
    'ConfirmAuthnMethodRegistration' : IDL.Record({
      'expiration' : IDL.Nat64,
      'verification_code' : IDL.Text,
      'registration_id' : IDL.Text,
    }),
    'ReleaseFailed' : IDL.Record({ 'error' : ReleaseError }),
    'EnterAuthnMethodRegistrationMode' : RestartReleaseIdentityArgs,
    'WaitingAuthnMethodRegistration' : IDL.Record({
      'expiration' : IDL.Nat64,
      'confirm_error' : IDL.Opt(ConfirmAuthnMethodRegistrationError),
      'registration_id' : IDL.Text,
    }),
    'EnsureOrphanedRegistrationExited' : RestartReleaseIdentityArgs,
    'CheckingAccessFromOwnerAuthnMethod' : IDL.Null,
  });
  const LimitFailureReason = IDL.Variant({
    'TooManyNeurons' : IDL.Null,
    'TooManyAccounts' : IDL.Null,
  });
  const UnsellableReason = IDL.Variant({
    'ValidationFailed' : IDL.Record({ 'reason' : IDL.Text }),
    'CertificateExpired' : IDL.Null,
    'CheckLimitFailed' : IDL.Record({ 'reason' : LimitFailureReason }),
    'ApproveOnAccount' : IDL.Record({ 'sub_account' : IDL.Vec(IDL.Nat8) }),
    'SaleDealCompleted' : IDL.Null,
  });
  const ReleaseInitiation = IDL.Variant({
    'DangerousToLoseIdentity' : IDL.Null,
    'IdentityAPIChanged' : IDL.Null,
    'Manual' : IDL.Record({ 'unsellable_reason' : IDL.Opt(UnsellableReason) }),
  });
  const CaptureError = IDL.Variant({
    'SessionRegistrationAlreadyInProgress' : IDL.Null,
    'SessionRegistrationModeExpired' : IDL.Null,
    'HolderAuthnMethodRegistrationModeOff' : IDL.Null,
    'SessionRegistrationModeOff' : IDL.Null,
    'HolderAuthnMethodRegistrationUnauthorized' : IDL.Null,
    'InvalidMetadata' : IDL.Text,
    'HolderDeviceLost' : IDL.Null,
  });
  const ConfirmHolderAuthnMethodRegistrationArgs = IDL.Record({
    'frontend_hostname' : IDL.Text,
  });
  const CaptureState = IDL.Variant({
    'CaptureFailed' : IDL.Record({ 'error' : CaptureError }),
    'CreateEcdsaKey' : IDL.Null,
    'GetHolderContractPrincipal' : ConfirmHolderAuthnMethodRegistrationArgs,
    'NeedConfirmAuthnMethodSessionRegistration' : IDL.Record({
      'confirmation_code' : IDL.Text,
      'expiration' : IDL.Nat64,
    }),
    'ObtainingIdentityAuthnMethods' : IDL.Null,
    'RegisterAuthnMethodSession' : IDL.Null,
    'FinishCapture' : IDL.Null,
    'ExitAndRegisterHolderAuthnMethod' : ConfirmHolderAuthnMethodRegistrationArgs,
    'DeletingIdentityAuthnMethods' : IDL.Record({
      'authn_pubkeys' : IDL.Vec(IDL.Vec(IDL.Nat8)),
      'active_registration' : IDL.Bool,
      'openid_credentials' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
    }),
    'StartCapture' : IDL.Null,
    'NeedDeleteProtectedIdentityAuthnMethod' : IDL.Record({
      'public_key' : IDL.Vec(IDL.Nat8),
      'meta_data' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    }),
  });
  const CheckAssetsState = IDL.Variant({
    'CheckAccountsForNoApprovePrepare' : IDL.Null,
    'FinishCheckAssets' : IDL.Null,
    'CheckAccountsForNoApproveSequential' : IDL.Record({
      'sub_accounts' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    }),
    'StartCheckAssets' : IDL.Null,
  });
  const ReferralRewardData = IDL.Record({
    'memo' : IDL.Nat64,
    'account' : LedgerAccount,
  });
  const SaleDealAcceptSubState = IDL.Variant({
    'TransferDeveloperReward' : IDL.Null,
    'StartAccept' : IDL.Null,
    'TransferHubReward' : IDL.Null,
    'ResolveReferralRewardData' : IDL.Null,
    'TransferSaleDealAmountToSellerAccount' : IDL.Null,
    'TransferReferralReward' : IDL.Record({
      'reward_data' : IDL.Opt(ReferralRewardData),
    }),
    'TransferSaleDealAmountToTransitAccount' : IDL.Null,
  });
  const SaleDealState = IDL.Variant({
    'Accept' : IDL.Record({
      'sub_state' : SaleDealAcceptSubState,
      'buyer' : IDL.Principal,
    }),
    'Trading' : IDL.Null,
    'WaitingSellOffer' : IDL.Null,
  });
  const CancelSaleDealState = IDL.Variant({
    'RefundBuyerFromTransitAccount' : IDL.Record({ 'buyer' : IDL.Principal }),
    'StartCancelSaleDeal' : IDL.Record({ 'sale_deal_state' : SaleDealState }),
  });
  const DelegationData = IDL.Record({
    'signature' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'public_key' : IDL.Vec(IDL.Nat8),
    'hostname' : IDL.Text,
    'timestamp' : IDL.Nat,
  });
  const QueryCanisterSignedRequest = IDL.Record({
    'request_sign' : IDL.Vec(IDL.Nat8),
    'canister_id' : IDL.Principal,
  });
  const DelegationState = IDL.Variant({
    'NeedPrepareDelegation' : IDL.Record({ 'hostname' : IDL.Text }),
    'GetDelegationWaiting' : IDL.Record({
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }),
  });
  const FetchNnsAssetsState = IDL.Variant({
    'GetNeuronsIds' : IDL.Null,
    'GetNeuronsInformation' : IDL.Record({
      'neuron_hotkeys' : IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Vec(IDL.Principal))),
    }),
    'DeletingNeuronsHotkeys' : IDL.Record({
      'neuron_hotkeys' : IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Vec(IDL.Principal))),
    }),
    'GetAccountsInformation' : IDL.Null,
    'GetAccountsBalances' : IDL.Null,
  });
  FetchAssetsState.fill(
    IDL.Variant({
      'FinishFetchAssets' : IDL.Null,
      'ObtainDelegationState' : IDL.Record({
        'sub_state' : DelegationState,
        'wrap_fetch_state' : FetchAssetsState,
      }),
      'FetchNnsAssetsState' : IDL.Record({ 'sub_state' : FetchNnsAssetsState }),
      'StartFetchAssets' : IDL.Null,
    })
  );
  HoldingState.fill(
    IDL.Variant({
      'CheckAssets' : IDL.Record({
        'sub_state' : CheckAssetsState,
        'wrap_holding_state' : HoldingState,
      }),
      'CancelSaleDeal' : IDL.Record({
        'sub_state' : CancelSaleDealState,
        'wrap_holding_state' : HoldingState,
      }),
      'Hold' : IDL.Record({
        'quarantine' : IDL.Opt(IDL.Nat64),
        'sale_deal_state' : IDL.Opt(SaleDealState),
      }),
      'FetchAssets' : IDL.Record({
        'fetch_assets_state' : FetchAssetsState,
        'wrap_holding_state' : HoldingState,
      }),
      'Unsellable' : IDL.Record({ 'reason' : UnsellableReason }),
      'ValidateAssets' : IDL.Record({ 'wrap_holding_state' : HoldingState }),
      'StartHolding' : IDL.Null,
    })
  );
  const HolderState = IDL.Variant({
    'Release' : IDL.Record({
      'sub_state' : ReleaseState,
      'release_initiation' : ReleaseInitiation,
    }),
    'Closed' : IDL.Record({ 'unsellable_reason' : IDL.Opt(UnsellableReason) }),
    'WaitingStartCapture' : IDL.Null,
    'Capture' : IDL.Record({ 'sub_state' : CaptureState }),
    'Holding' : IDL.Record({ 'sub_state' : HoldingState }),
    'WaitingActivation' : IDL.Null,
  });
  const CanisterCyclesState = IDL.Record({
    'initial_cycles' : IDL.Nat,
    'warning_threshold_cycles' : IDL.Nat,
    'current_cycles' : IDL.Nat,
    'critical_threshold_cycles' : IDL.Nat,
  });
  const HolderInformation = IDL.Record({
    'identity_name' : IDL.Opt(IDL.Text),
    'completed_sale_deal' : IDL.Opt(CompletedSaleDeal),
    'update_version' : IDL.Nat64,
    'holding_timestamp' : IDL.Opt(IDL.Nat64),
    'owner' : IDL.Opt(IDL.Principal),
    'assets' : IDL.Opt(Timestamped_4),
    'sale_deal' : IDL.Opt(SaleDeal),
    'processing_error' : IDL.Opt(Timestamped_6),
    'schedule_processing' : IDL.Opt(DelayedTimestampMillis),
    'state' : HolderState,
    'canister_cycles_state' : CanisterCyclesState,
    'fetching_assets' : IDL.Opt(HolderAssets),
    'identity_number' : IDL.Opt(IDL.Nat64),
  });
  const ProcessHolderResult = IDL.Record({
    'holder_information' : HolderInformation,
  });
  const CheckApprovedBalanceError = IDL.Variant({
    'InsufficientAllowance' : IDL.Null,
    'InsufficientBalance' : IDL.Null,
    'InvalidApprovedAccount' : IDL.Record({ 'reason' : IDL.Text }),
    'LedgerUnavailable' : IDL.Record({ 'reason' : IDL.Text }),
    'AllowanceExpiresTooEarly' : IDL.Null,
  });
  const AcceptBuyerOfferError = IDL.Variant({
    'OfferMismatch' : IDL.Null,
    'HigherBuyerOfferExists' : IDL.Null,
    'OfferNotFound' : IDL.Null,
    'PermissionDenied' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'CheckApprovedBalanceError' : IDL.Record({
      'error' : CheckApprovedBalanceError,
    }),
    'OfferRemoved' : IDL.Null,
    'CriticalCyclesLevel' : IDL.Record({
      'critical_threshold_cycles' : IDL.Nat,
    }),
  });
  const AcceptBuyerOfferResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : AcceptBuyerOfferError,
  });
  const AcceptSellerOfferArgs = IDL.Record({
    'referral' : IDL.Opt(IDL.Text),
    'price' : IDL.Nat64,
    'approved_account' : LedgerAccount,
  });
  const AcceptSellerOfferError = IDL.Variant({
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'CheckApprovedBalanceError' : IDL.Record({
      'error' : CheckApprovedBalanceError,
    }),
    'CriticalCyclesLevel' : IDL.Record({
      'critical_threshold_cycles' : IDL.Nat,
    }),
    'PriceMismatch' : IDL.Null,
    'InvalidReferral' : IDL.Null,
  });
  const AcceptSellerOfferResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : AcceptSellerOfferError,
  });
  const CheckPermissionStrategy = IDL.Variant({
    'CheckCallerIsDeployer' : IDL.Null,
    'CheckContractActivationCode' : IDL.Record({ 'code' : IDL.Text }),
  });
  const ActivateContractArgs = IDL.Record({
    'check_permission_strategy' : CheckPermissionStrategy,
    'contract_owner' : IDL.Principal,
  });
  const ActivateContractError = IDL.Variant({
    'ValidationFailed' : IDL.Record({ 'reason' : IDL.Text }),
    'ContractActivationNotRequired' : IDL.Null,
    'ContractCallError' : IDL.Record({ 'reason' : IDL.Text }),
    'AlreadyActivated' : IDL.Record({ 'owner' : IDL.Principal }),
    'ContractLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
  });
  const ActivateContractResponse = IDL.Variant({
    'Ok' : IDL.Null,
    'Err' : ActivateContractError,
  });
  const AddContractControllerArgs = IDL.Record({
    'controller' : IDL.Principal,
  });
  const AddContractControllerError = IDL.Variant({
    'ContractNotActivated' : IDL.Null,
    'AddControllerDelay' : IDL.Record({ 'delay' : DelayedTimestampMillis }),
    'CertificateNotExpired' : IDL.Null,
    'PermissionDenied' : IDL.Null,
    'ManagementCallError' : IDL.Record({ 'reason' : IDL.Text }),
    'CriticalCyclesLevel' : IDL.Record({
      'critical_threshold_cycles' : IDL.Nat,
    }),
    'ContractLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
  });
  const AddContractControllerResponse = IDL.Variant({
    'Ok' : IDL.Null,
    'Err' : AddContractControllerError,
  });
  const CancelBuyerOfferError = IDL.Variant({
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'NoBuyerOffer' : IDL.Null,
  });
  const CancelBuyerOfferResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : CancelBuyerOfferError,
  });
  const CancelCaptureIdentityError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
  });
  const CancelCaptureIdentityResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : CancelCaptureIdentityError,
  });
  const CancelSaleIntentionError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
  });
  const CancelSaleIntentionResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : CancelSaleIntentionError,
  });
  const ChangeSaleIntentionArgs = IDL.Record({
    'receiver_account' : LedgerAccount,
  });
  const ChangeSaleIntentionError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'InvalidAccountIdentifier' : IDL.Null,
  });
  const ChangeSaleIntentionResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : ChangeSaleIntentionError,
  });
  const ConfirmOwnerAuthnMethodRegistrationArgs = IDL.Record({
    'verification_code' : IDL.Text,
  });
  const CanisterMetrics = IDL.Record({
    'stable_memory_size' : IDL.Nat64,
    'cycles' : IDL.Nat,
    'heap_memory_size' : IDL.Nat64,
  });
  const GetCanisterMetricsResult = IDL.Record({ 'metrics' : CanisterMetrics });
  const GetCanisterMetricsError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
  });
  const GetCanisterMetricsResponse = IDL.Variant({
    'Ok' : GetCanisterMetricsResult,
    'Err' : GetCanisterMetricsError,
  });
  const MemoryMetrics = IDL.Record({
    'wasm_binary_size' : IDL.Nat,
    'wasm_chunk_store_size' : IDL.Nat,
    'canister_history_size' : IDL.Nat,
    'stable_memory_size' : IDL.Nat,
    'snapshots_size' : IDL.Nat,
    'wasm_memory_size' : IDL.Nat,
    'global_memory_size' : IDL.Nat,
    'custom_sections_size' : IDL.Nat,
  });
  const CanisterStatusType = IDL.Variant({
    'stopped' : IDL.Null,
    'stopping' : IDL.Null,
    'running' : IDL.Null,
  });
  const EnvironmentVariable = IDL.Record({
    'value' : IDL.Text,
    'name' : IDL.Text,
  });
  const LogVisibility = IDL.Variant({
    'controllers' : IDL.Null,
    'public' : IDL.Null,
    'allowed_viewers' : IDL.Vec(IDL.Principal),
  });
  const DefiniteCanisterSettings = IDL.Record({
    'freezing_threshold' : IDL.Nat,
    'wasm_memory_threshold' : IDL.Nat,
    'environment_variables' : IDL.Vec(EnvironmentVariable),
    'controllers' : IDL.Vec(IDL.Principal),
    'reserved_cycles_limit' : IDL.Nat,
    'log_visibility' : LogVisibility,
    'wasm_memory_limit' : IDL.Nat,
    'memory_allocation' : IDL.Nat,
    'compute_allocation' : IDL.Nat,
  });
  const QueryStats = IDL.Record({
    'response_payload_bytes_total' : IDL.Nat,
    'num_instructions_total' : IDL.Nat,
    'num_calls_total' : IDL.Nat,
    'request_payload_bytes_total' : IDL.Nat,
  });
  const CanisterStatusResult = IDL.Record({
    'memory_metrics' : MemoryMetrics,
    'status' : CanisterStatusType,
    'memory_size' : IDL.Nat,
    'ready_for_migration' : IDL.Bool,
    'version' : IDL.Nat64,
    'cycles' : IDL.Nat,
    'settings' : DefiniteCanisterSettings,
    'query_stats' : QueryStats,
    'idle_cycles_burned_per_day' : IDL.Nat,
    'module_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'reserved_cycles' : IDL.Nat,
  });
  const GetCanisterStatusResult = IDL.Record({
    'canister_status_response' : CanisterStatusResult,
  });
  const GetCanisterStatusError = IDL.Variant({
    'ManagementCallError' : IDL.Record({ 'reason' : IDL.Text }),
  });
  const GetCanisterStatusResponse = IDL.Variant({
    'Ok' : GetCanisterStatusResult,
    'Err' : GetCanisterStatusError,
  });
  const GetContractCertificateResult = IDL.Record({
    'certificate' : SignedContractCertificate,
  });
  const GetContractCertificateError = IDL.Variant({
    'ContractCallError' : IDL.Record({ 'reason' : IDL.Text }),
  });
  const GetContractCertificateResponse = IDL.Variant({
    'Ok' : GetContractCertificateResult,
    'Err' : GetContractCertificateError,
  });
  const GetContractOwnerResult = IDL.Record({ 'owner' : IDL.Principal });
  const GetContractOwnerError = IDL.Variant({
    'ContractNotActivated' : IDL.Null,
    'ContractActivationNotRequired' : IDL.Null,
  });
  const GetContractOwnerResponse = IDL.Variant({
    'Ok' : GetContractOwnerResult,
    'Err' : GetContractOwnerError,
  });
  const IdentityEventsSortingKey = IDL.Variant({ 'Created' : IDL.Null });
  const SortingOrder = IDL.Variant({
    'Descending' : IDL.Null,
    'Ascending' : IDL.Null,
  });
  const SortingDefinition = IDL.Record({
    'key' : IdentityEventsSortingKey,
    'order' : SortingOrder,
  });
  const ChunkDef = IDL.Record({ 'count' : IDL.Nat64, 'start' : IDL.Nat64 });
  const GetHolderEventsArgs = IDL.Record({
    'sorting' : IDL.Opt(SortingDefinition),
    'chunk_def' : ChunkDef,
  });
  const CaptureProcessingEvent = IDL.Variant({
    'HolderAuthnMethodRegistered' : IDL.Null,
    'AuthnMethodSessionRegistrationConfirmed' : ConfirmHolderAuthnMethodRegistrationArgs,
    'IdentityAuthnMethodProtected' : IDL.Record({
      'public_key' : IDL.Vec(IDL.Nat8),
      'meta_data' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    }),
    'IdentityOpenidCredentialDeleted' : IDL.Record({
      'openid_credential_key' : IDL.Tuple(IDL.Text, IDL.Text),
    }),
    'HolderContractPrincipalIsHolderOwner' : IDL.Null,
    'IdentityAuthnMethodRegistrationExited' : IDL.Null,
    'CaptureFinished' : IDL.Null,
    'ProtectedIdentityAuthnMethodDeleted' : IDL.Null,
    'GetHolderContractPrincipalUnathorized' : IDL.Null,
    'IdentityAuthnMethodsPartiallyDeleted' : IDL.Null,
    'AuthnMethodSessionRegisterError' : IDL.Record({ 'error' : CaptureError }),
    'HolderContractPrincipalObtained' : IDL.Record({
      'holder_contract_principal' : IDL.Principal,
    }),
    'EcdsaKeyCreated' : IDL.Record({ 'ecdsa_key' : IDL.Vec(IDL.Nat8) }),
    'AuthnMethodSessionRegistered' : IDL.Record({
      'confirmation_code' : IDL.Text,
      'expiration' : IDL.Nat64,
    }),
    'HolderAuthnMethodLost' : IDL.Null,
    'AuthnMethodSessionRegistrationExpired' : IDL.Null,
    'CancelCapture' : IDL.Null,
    'IdentityAuthnMethodsObtained' : IDL.Record({
      'authn_pubkeys' : IDL.Vec(IDL.Vec(IDL.Nat8)),
      'active_registration' : IDL.Bool,
      'openid_credentials' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
    }),
    'IdentityAPIChangeDetected' : IDL.Null,
    'HolderAuthnMethodRegisterError' : IDL.Record({ 'error' : CaptureError }),
    'IdentityAuthnMethodDeleted' : IDL.Record({
      'public_key' : IDL.Vec(IDL.Nat8),
    }),
    'IdentityAuthnMethodsDeleted' : IDL.Record({
      'identity_name' : IDL.Opt(IDL.Text),
    }),
    'IdentityAuthnMethodsResync' : IDL.Null,
    'CaptureStarted' : IDL.Null,
  });
  const ReleaseProcessingEvent = IDL.Variant({
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : IDL.Null,
    'ReleaseRestarted' : IDL.Record({ 'registration_id' : IDL.Opt(IDL.Text) }),
    'OrphanedAuthnRegistrationModeUnauthorized' : IDL.Null,
    'DeleteHolderAuthnMethod' : IDL.Null,
    'OrphanedAuthnRegistrationModeExited' : IDL.Null,
    'AuthnMethodRegistrationModeEntered' : IDL.Record({
      'expiration' : IDL.Nat64,
      'registration_id' : IDL.Text,
    }),
    'HolderAuthnMethodNotFound' : IDL.Null,
    'AuthnMethodRegistrationModeOff' : IDL.Null,
    'AuthnMethodRegistrationModeEnterUnathorized' : IDL.Null,
    'ConfirmAuthnMethodRegistration' : ConfirmOwnerAuthnMethodRegistrationArgs,
    'ReleaseStarted' : IDL.Null,
    'AuthnMethodRegistrationNotRegistered' : IDL.Null,
    'AuthnMethodRegistrationConfirmed' : IDL.Null,
    'AuthnMethodRegistrationModeEnterFail' : IDL.Record({
      'error' : ReleaseError,
    }),
    'AuthnMethodRegistrationExpired' : IDL.Null,
    'AuthnMethodRegistrationWrongCode' : ConfirmAuthnMethodRegistrationError,
    'HolderAuthnMethodDeleted' : IDL.Null,
  });
  const CheckAssetsEvent = IDL.Variant({
    'CheckAccountsAdvance' : IDL.Record({ 'sub_account' : IDL.Vec(IDL.Nat8) }),
    'CheckAssetsFinished' : IDL.Null,
    'AccountHasApprove' : IDL.Record({ 'sub_account' : IDL.Vec(IDL.Nat8) }),
    'CheckAssetsStarted' : IDL.Null,
    'CheckAccountsPrepared' : IDL.Record({
      'sub_accounts' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    }),
  });
  const ObtainDelegationEvent = IDL.Variant({
    'RetryPrepareDelegation' : IDL.Null,
    'DelegationGot' : IDL.Record({ 'delegation_data' : DelegationData }),
    'DelegationPrepared' : IDL.Record({
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }),
    'DelegationLost' : IDL.Null,
  });
  const FetchAssetsEvent = IDL.Variant({
    'NeuronsInformationGot' : IDL.Record({
      'hk_neurons' : IDL.Vec(NeuronAsset),
      'ctrl_neurons' : IDL.Vec(IDL.Tuple(NeuronAsset, IDL.Vec(IDL.Principal))),
    }),
    'NeuronsInformationObtained' : IDL.Null,
    'NeuronsInformationGotEmpty' : IDL.Record({
      'neuron_ids' : IDL.Vec(IDL.Nat64),
    }),
    'NeuronsIdsGot' : IDL.Record({ 'neuron_ids' : IDL.Vec(IDL.Nat64) }),
    'AccountsBalancesObtained' : IDL.Null,
    'NeuronHotkeyDeleted' : IDL.Record({
      'hot_key' : IDL.Principal,
      'failed' : IDL.Opt(IDL.Text),
      'neuron_id' : IDL.Nat64,
    }),
    'TooManyNeurons' : IDL.Null,
    'ObtainDelegation' : IDL.Record({ 'event' : ObtainDelegationEvent }),
    'AllNeuronsHotkeysDeleted' : IDL.Null,
    'AccountBalanceObtained' : IDL.Record({
      'balance' : IDL.Nat64,
      'account_identifier' : IDL.Vec(IDL.Nat8),
    }),
    'TooManyAccounts' : IDL.Null,
    'AccountsInformationGot' : IDL.Record({
      'accounts_information' : IDL.Opt(AccountsInformation),
    }),
    'FetchAssetsStarted' : IDL.Record({
      'fetch_assets_state' : FetchAssetsState,
    }),
    'FetchAssetsFinished' : IDL.Null,
  });
  const TransferInformation = IDL.Record({
    'block_index' : IDL.Nat64,
    'receiver_account_hex' : IDL.Text,
    'amount' : IDL.Nat64,
  });
  const SaleDealProcessingEvent = IDL.Variant({
    'SaleDealAmountToTransitTransferred' : IDL.Record({
      'block_index' : IDL.Opt(IDL.Nat64),
    }),
    'SetSaleOffer' : IDL.Record({ 'price' : IDL.Nat64 }),
    'SaleDealAmountToSellerTransferred' : IDL.Record({
      'seller_amount' : IDL.Nat64,
      'transfer' : IDL.Opt(TransferInformation),
    }),
    'CertificateExpired' : IDL.Null,
    'ChangeSaleIntention' : ChangeSaleIntentionArgs,
    'BuyerFromTransitAccountRefunded' : IDL.Record({
      'buyer' : IDL.Principal,
      'refund' : IDL.Opt(TransferInformation),
    }),
    'RefundBuyerFromTransitAccount' : IDL.Record({ 'buyer' : IDL.Principal }),
    'CancelBuyerOffer' : IDL.Record({ 'buyer' : IDL.Principal }),
    'DeveloperRewardTransferred' : IDL.Record({
      'transfer' : IDL.Opt(TransferInformation),
    }),
    'SaleDealAcceptStarted' : IDL.Null,
    'TransferSaleDealAmountToTransitFailed' : IDL.Record({
      'reason' : IDL.Text,
    }),
    'ReferralRewardDataResolvingFailed' : IDL.Record({ 'reason' : IDL.Text }),
    'AcceptSellerOffer' : IDL.Record({
      'referral' : IDL.Opt(IDL.Text),
      'previous_referral' : IDL.Opt(IDL.Text),
      'expiration' : IDL.Nat64,
      'buyer' : IDL.Principal,
      'price' : IDL.Nat64,
      'approved_account' : LedgerAccount,
    }),
    'SaleIntentionExpired' : IDL.Null,
    'RemoveFailedBuyerOffer' : IDL.Record({
      'offer_amount' : IDL.Nat64,
      'buyer' : IDL.Principal,
    }),
    'SetBuyerOffer' : IDL.Record({
      'referral' : IDL.Opt(IDL.Text),
      'previous_referral' : IDL.Opt(IDL.Text),
      'offer_amount' : IDL.Nat64,
      'expiration' : IDL.Nat64,
      'buyer' : IDL.Principal,
      'max_buyer_offers' : IDL.Nat64,
      'approved_account' : LedgerAccount,
    }),
    'HubRewardTransferred' : IDL.Record({
      'transfer' : IDL.Opt(TransferInformation),
    }),
    'SaleDealCanceled' : IDL.Null,
    'CancelSaleIntention' : IDL.Null,
    'ReferralRewardTransferred' : IDL.Record({
      'transfer' : IDL.Opt(TransferInformation),
    }),
    'ReferralRewardDataResolved' : IDL.Record({
      'reward_data' : IDL.Opt(ReferralRewardData),
    }),
    'AcceptBuyerOffer' : IDL.Record({
      'offer_amount' : IDL.Nat64,
      'buyer' : IDL.Principal,
    }),
    'SetSaleIntention' : IDL.Record({
      'receiver_account' : LedgerAccount,
      'sale_deal_expiration_time' : IDL.Nat64,
    }),
  });
  const HoldingProcessingEvent = IDL.Variant({
    'CheckAssets' : IDL.Record({ 'event' : CheckAssetsEvent }),
    'QuarantineCompleted' : IDL.Null,
    'FetchAssets' : IDL.Record({ 'event' : FetchAssetsEvent }),
    'SellableExpired' : IDL.Null,
    'AssetsValidated' : IDL.Null,
    'StartRelease' : IDL.Null,
    'HoldingStarted' : IDL.Record({ 'quarantine_completion_time' : IDL.Nat64 }),
    'HoldingStartExpired' : IDL.Null,
    'ValidateAssetsFailed' : IDL.Record({ 'reason' : IDL.Text }),
    'SaleDeal' : IDL.Record({ 'event' : SaleDealProcessingEvent }),
  });
  const HolderProcessingEvent = IDL.Variant({
    'DelayAddContractController' : IDL.Record({ 'time' : IDL.Nat64 }),
    'Capturing' : IDL.Record({ 'event' : CaptureProcessingEvent }),
    'AllowAddContractController' : IDL.Null,
    'Releasing' : IDL.Record({ 'event' : ReleaseProcessingEvent }),
    'StartCaptureIdentity' : IDL.Record({ 'identity_number' : IDL.Nat64 }),
    'ProcessingError' : IDL.Record({ 'error' : HolderProcessingError }),
    'ContractActivated' : GetContractOwnerResult,
    'Holding' : IDL.Record({ 'event' : HoldingProcessingEvent }),
  });
  const IdentifiedHolderProcessingEvent = IDL.Record({
    'id' : IDL.Nat64,
    'time' : IDL.Nat64,
    'event' : HolderProcessingEvent,
  });
  const GetHolderEventsResult = IDL.Record({
    'events' : IDL.Vec(IdentifiedHolderProcessingEvent),
    'total_count' : IDL.Nat64,
  });
  const GeHolderEventsResponse = IDL.Variant({ 'Ok' : GetHolderEventsResult });
  const GetHolderInformationResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
  });
  const ProcessHolderResponse = IDL.Variant({ 'Ok' : ProcessHolderResult });
  const ReceiveDelegationArgs = IDL.Record({
    'get_delegation_response' : IDL.Vec(IDL.Nat8),
  });
  const ReceiveDelegationError = IDL.Variant({
    'ResponseNotContainsDelegation' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'DelegationWrong' : IDL.Record({ 'reason' : IDL.Text }),
  });
  const ReceiveDelegationResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : ReceiveDelegationError,
  });
  const RetryPrepareDelegationError = IDL.Variant({
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
  });
  const RetryPrepareDelegationResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : RetryPrepareDelegationError,
  });
  const SetBuyerOfferArgs = IDL.Record({
    'referral' : IDL.Opt(IDL.Text),
    'offer_amount' : IDL.Nat64,
    'approved_account' : LedgerAccount,
  });
  const SetBuyerOfferError = IDL.Variant({
    'OfferAmountExceedsPrice' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'OfferAmountTooLow' : IDL.Record({
      'min_sell_price_inclusively' : IDL.Nat64,
    }),
    'CheckApprovedBalanceError' : IDL.Record({
      'error' : CheckApprovedBalanceError,
    }),
    'InvalidReferral' : IDL.Null,
  });
  const SetBuyerOfferResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : SetBuyerOfferError,
  });
  const SetSaleIntentionArgs = IDL.Record({
    'receiver_account' : LedgerAccount,
  });
  const SetSaleIntentionError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
    'CertificateExpirationImminent' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'InvalidAccountIdentifier' : IDL.Null,
  });
  const SetSaleIntentionResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : SetSaleIntentionError,
  });
  const SetSaleOfferArgs = IDL.Record({ 'price' : IDL.Nat64 });
  const SetSaleOfferError = IDL.Variant({
    'HigherBuyerOfferExists' : IDL.Null,
    'PermissionDenied' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
    'PriceTooLow' : IDL.Record({ 'min_sell_price_inclusively' : IDL.Nat64 }),
  });
  const SetSaleOfferResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : SetSaleOfferError,
  });
  const StartCaptureIdentityArgs = IDL.Record({
    'identity_number' : IDL.Nat64,
  });
  const StartCaptureIdentityError = IDL.Variant({
    'PermissionDenied' : IDL.Null,
    'CertificateExpirationImminent' : IDL.Null,
    'HolderLocked' : IDL.Record({ 'lock' : DelayedTimestampMillis }),
    'HolderWrongState' : IDL.Null,
  });
  const StartCaptureIdentityResponse = IDL.Variant({
    'Ok' : ProcessHolderResult,
    'Err' : StartCaptureIdentityError,
  });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const HttpRequestResult = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : HttpRequestResult,
  });
  return IDL.Service({
    'accept_buyer_offer' : IDL.Func(
        [AcceptBuyerOfferArgs],
        [AcceptBuyerOfferResponse],
        [],
      ),
    'accept_seller_offer' : IDL.Func(
        [AcceptSellerOfferArgs],
        [AcceptSellerOfferResponse],
        [],
      ),
    'activate_contract' : IDL.Func(
        [ActivateContractArgs],
        [ActivateContractResponse],
        [],
      ),
    'add_contract_controller' : IDL.Func(
        [AddContractControllerArgs],
        [AddContractControllerResponse],
        [],
      ),
    'cancel_buyer_offer' : IDL.Func(
        [IDL.Record({})],
        [CancelBuyerOfferResponse],
        [],
      ),
    'cancel_capture_identity' : IDL.Func(
        [IDL.Record({})],
        [CancelCaptureIdentityResponse],
        [],
      ),
    'cancel_sale_intention' : IDL.Func(
        [IDL.Record({})],
        [CancelSaleIntentionResponse],
        [],
      ),
    'change_sale_intention' : IDL.Func(
        [ChangeSaleIntentionArgs],
        [ChangeSaleIntentionResponse],
        [],
      ),
    'confirm_holder_authn_method_registration' : IDL.Func(
        [ConfirmHolderAuthnMethodRegistrationArgs],
        [CancelSaleIntentionResponse],
        [],
      ),
    'confirm_owner_authn_method_registration' : IDL.Func(
        [ConfirmOwnerAuthnMethodRegistrationArgs],
        [CancelSaleIntentionResponse],
        [],
      ),
    'delete_holder_authn_method' : IDL.Func(
        [IDL.Record({})],
        [CancelSaleIntentionResponse],
        [],
      ),
    'get_canister_metrics' : IDL.Func(
        [IDL.Record({})],
        [GetCanisterMetricsResponse],
        ['query'],
      ),
    'get_canister_status' : IDL.Func([], [GetCanisterStatusResponse], []),
    'get_contract_certificate' : IDL.Func(
        [IDL.Record({})],
        [GetContractCertificateResponse],
        [],
      ),
    'get_contract_owner' : IDL.Func(
        [IDL.Record({})],
        [GetContractOwnerResponse],
        [],
      ),
    'get_holder_events' : IDL.Func(
        [GetHolderEventsArgs],
        [GeHolderEventsResponse],
        ['query'],
      ),
    'get_holder_information' : IDL.Func(
        [IDL.Record({})],
        [GetHolderInformationResponse],
        [],
      ),
    'get_holder_information_query' : IDL.Func(
        [IDL.Record({})],
        [GetHolderInformationResponse],
        ['query'],
      ),
    'process_holder' : IDL.Func([IDL.Record({})], [ProcessHolderResponse], []),
    'protected_authn_method_deleted' : IDL.Func(
        [IDL.Record({})],
        [CancelSaleIntentionResponse],
        [],
      ),
    'receive_delegation' : IDL.Func(
        [ReceiveDelegationArgs],
        [ReceiveDelegationResponse],
        [],
      ),
    'restart_release_identity' : IDL.Func(
        [RestartReleaseIdentityArgs],
        [CancelSaleIntentionResponse],
        [],
      ),
    'retry_prepare_delegation' : IDL.Func(
        [IDL.Record({})],
        [RetryPrepareDelegationResponse],
        [],
      ),
    'set_buyer_offer' : IDL.Func(
        [SetBuyerOfferArgs],
        [SetBuyerOfferResponse],
        [],
      ),
    'set_sale_intention' : IDL.Func(
        [SetSaleIntentionArgs],
        [SetSaleIntentionResponse],
        [],
      ),
    'set_sale_offer' : IDL.Func([SetSaleOfferArgs], [SetSaleOfferResponse], []),
    'start_capture_identity' : IDL.Func(
        [StartCaptureIdentityArgs],
        [StartCaptureIdentityResponse],
        [],
      ),
    'start_release_identity' : IDL.Func(
        [IDL.Record({})],
        [CancelSaleIntentionResponse],
        [],
      ),
    'transform_http_response' : IDL.Func(
        [TransformArgs],
        [HttpRequestResult],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => {
  const ContractCertificate = IDL.Record({
    'deployer' : IDL.Principal,
    'contract_canister' : IDL.Principal,
    'hub_canister' : IDL.Principal,
    'contract_wasm_hash' : IDL.Text,
    'expiration' : IDL.Nat64,
    'contract_template_id' : IDL.Nat64,
  });
  const SignedContractCertificate = IDL.Record({
    'signature' : IDL.Vec(IDL.Nat8),
    'contract_certificate' : ContractCertificate,
  });
  const InitContractArgs = IDL.Record({
    'certificate' : SignedContractCertificate,
    'contract_activation_code_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'root_public_key_raw' : IDL.Vec(IDL.Nat8),
  });
  return [InitContractArgs];
};
