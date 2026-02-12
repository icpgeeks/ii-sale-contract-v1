import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AcceptBuyerOfferArgs {
  'offer_amount' : bigint,
  'check_higher_offer' : boolean,
  'buyer' : Principal,
}
export type AcceptBuyerOfferError = { 'OfferMismatch' : null } |
  { 'HigherBuyerOfferExists' : null } |
  { 'OfferNotFound' : null } |
  { 'PermissionDenied' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'CheckApprovedBalanceError' : { 'error' : CheckApprovedBalanceError } } |
  { 'OfferRemoved' : null } |
  { 'CriticalCyclesLevel' : { 'critical_threshold_cycles' : bigint } };
export type AcceptBuyerOfferResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : AcceptBuyerOfferError };
export interface AcceptSellerOfferArgs {
  'referral' : [] | [string],
  'price' : bigint,
  'approved_account' : LedgerAccount,
}
export type AcceptSellerOfferError = {
    'HolderLocked' : { 'lock' : DelayedTimestampMillis }
  } |
  { 'HolderWrongState' : null } |
  { 'CheckApprovedBalanceError' : { 'error' : CheckApprovedBalanceError } } |
  { 'CriticalCyclesLevel' : { 'critical_threshold_cycles' : bigint } } |
  { 'PriceMismatch' : null } |
  { 'InvalidReferral' : null };
export type AcceptSellerOfferResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : AcceptSellerOfferError };
export interface AccountInformation {
  'balance' : [] | [Timestamped_2],
  'account_identifier' : Uint8Array | number[],
}
export interface AccountsInformation {
  'principal' : Principal,
  'main_account_information' : [] | [AccountInformation],
  'sub_accounts' : Array<SubAccountInformation>,
}
export interface ActivateContractArgs {
  'check_permission_strategy' : CheckPermissionStrategy,
  'contract_owner' : Principal,
}
export type ActivateContractError = {
    'ValidationFailed' : { 'reason' : string }
  } |
  { 'ContractActivationNotRequired' : null } |
  { 'ContractCallError' : { 'reason' : string } } |
  { 'AlreadyActivated' : { 'owner' : Principal } } |
  { 'ContractLocked' : { 'lock' : DelayedTimestampMillis } };
export type ActivateContractResponse = { 'Ok' : null } |
  { 'Err' : ActivateContractError };
export interface AddContractControllerArgs { 'controller' : Principal }
export type AddContractControllerError = { 'ContractNotActivated' : null } |
  { 'AddControllerDelay' : { 'delay' : DelayedTimestampMillis } } |
  { 'CertificateNotExpired' : null } |
  { 'PermissionDenied' : null } |
  { 'ManagementCallError' : { 'reason' : string } } |
  { 'CriticalCyclesLevel' : { 'critical_threshold_cycles' : bigint } } |
  { 'ContractLocked' : { 'lock' : DelayedTimestampMillis } };
export type AddContractControllerResponse = { 'Ok' : null } |
  { 'Err' : AddContractControllerError };
export interface BuyerOffer {
  'referral' : [] | [string],
  'offer_amount' : bigint,
  'buyer' : Principal,
  'approved_account' : LedgerAccount,
}
export type CancelBuyerOfferError = {
    'HolderLocked' : { 'lock' : DelayedTimestampMillis }
  } |
  { 'HolderWrongState' : null } |
  { 'NoBuyerOffer' : null };
export type CancelBuyerOfferResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : CancelBuyerOfferError };
export type CancelCaptureIdentityError = { 'PermissionDenied' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null };
export type CancelCaptureIdentityResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : CancelCaptureIdentityError };
export type CancelSaleDealState = {
    'RefundBuyerFromTransitAccount' : { 'buyer' : Principal }
  } |
  { 'StartCancelSaleDeal' : { 'sale_deal_state' : SaleDealState } };
export type CancelSaleIntentionError = { 'PermissionDenied' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null };
export type CancelSaleIntentionResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : CancelSaleIntentionError };
export interface CanisterCyclesState {
  'initial_cycles' : bigint,
  'warning_threshold_cycles' : bigint,
  'current_cycles' : bigint,
  'critical_threshold_cycles' : bigint,
}
export interface CanisterMetrics {
  'stable_memory_size' : bigint,
  'cycles' : bigint,
  'heap_memory_size' : bigint,
}
export interface CanisterStatusResult {
  'memory_metrics' : MemoryMetrics,
  'status' : CanisterStatusType,
  'memory_size' : bigint,
  'ready_for_migration' : boolean,
  'version' : bigint,
  'cycles' : bigint,
  'settings' : DefiniteCanisterSettings,
  'query_stats' : QueryStats,
  'idle_cycles_burned_per_day' : bigint,
  'module_hash' : [] | [Uint8Array | number[]],
  'reserved_cycles' : bigint,
}
export type CanisterStatusType = { 'stopped' : null } |
  { 'stopping' : null } |
  { 'running' : null };
export type CaptureError = { 'SessionRegistrationAlreadyInProgress' : null } |
  { 'SessionRegistrationModeExpired' : null } |
  { 'HolderAuthnMethodRegistrationModeOff' : null } |
  { 'SessionRegistrationModeOff' : null } |
  { 'HolderAuthnMethodRegistrationUnauthorized' : null } |
  { 'InvalidMetadata' : string } |
  { 'HolderDeviceLost' : null };
export type CaptureProcessingEvent = { 'HolderAuthnMethodRegistered' : null } |
  {
    'AuthnMethodSessionRegistrationConfirmed' : ConfirmHolderAuthnMethodRegistrationArgs
  } |
  {
    'IdentityAuthnMethodProtected' : {
      'public_key' : Uint8Array | number[],
      'meta_data' : Array<[string, string]>,
    }
  } |
  {
    'IdentityOpenidCredentialDeleted' : {
      'openid_credential_key' : [string, string],
    }
  } |
  { 'HolderContractPrincipalIsHolderOwner' : null } |
  { 'IdentityAuthnMethodRegistrationExited' : null } |
  { 'CaptureFinished' : null } |
  { 'ProtectedIdentityAuthnMethodDeleted' : null } |
  { 'GetHolderContractPrincipalUnathorized' : null } |
  { 'IdentityAuthnMethodsPartiallyDeleted' : null } |
  { 'AuthnMethodSessionRegisterError' : { 'error' : CaptureError } } |
  {
    'HolderContractPrincipalObtained' : {
      'holder_contract_principal' : Principal,
    }
  } |
  { 'EcdsaKeyCreated' : { 'ecdsa_key' : Uint8Array | number[] } } |
  {
    'AuthnMethodSessionRegistered' : {
      'confirmation_code' : string,
      'expiration' : bigint,
    }
  } |
  { 'HolderAuthnMethodLost' : null } |
  { 'AuthnMethodSessionRegistrationExpired' : null } |
  { 'CancelCapture' : null } |
  {
    'IdentityAuthnMethodsObtained' : {
      'authn_pubkeys' : Array<Uint8Array | number[]>,
      'active_registration' : boolean,
      'openid_credentials' : [] | [Array<[string, string]>],
    }
  } |
  { 'IdentityAPIChangeDetected' : null } |
  { 'HolderAuthnMethodRegisterError' : { 'error' : CaptureError } } |
  { 'IdentityAuthnMethodDeleted' : { 'public_key' : Uint8Array | number[] } } |
  { 'IdentityAuthnMethodsDeleted' : { 'identity_name' : [] | [string] } } |
  { 'IdentityAuthnMethodsResync' : null } |
  { 'CaptureStarted' : null };
export type CaptureState = { 'CaptureFailed' : { 'error' : CaptureError } } |
  { 'CreateEcdsaKey' : null } |
  { 'GetHolderContractPrincipal' : ConfirmHolderAuthnMethodRegistrationArgs } |
  {
    'NeedConfirmAuthnMethodSessionRegistration' : {
      'confirmation_code' : string,
      'expiration' : bigint,
    }
  } |
  { 'ObtainingIdentityAuthnMethods' : null } |
  { 'RegisterAuthnMethodSession' : null } |
  { 'FinishCapture' : null } |
  {
    'ExitAndRegisterHolderAuthnMethod' : ConfirmHolderAuthnMethodRegistrationArgs
  } |
  {
    'DeletingIdentityAuthnMethods' : {
      'authn_pubkeys' : Array<Uint8Array | number[]>,
      'active_registration' : boolean,
      'openid_credentials' : [] | [Array<[string, string]>],
    }
  } |
  { 'StartCapture' : null } |
  {
    'NeedDeleteProtectedIdentityAuthnMethod' : {
      'public_key' : Uint8Array | number[],
      'meta_data' : Array<[string, string]>,
    }
  };
export interface ChangeSaleIntentionArgs { 'receiver_account' : LedgerAccount }
export type ChangeSaleIntentionError = { 'PermissionDenied' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'InvalidAccountIdentifier' : null };
export type ChangeSaleIntentionResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : ChangeSaleIntentionError };
export type CheckApprovedBalanceError = { 'InsufficientAllowance' : null } |
  { 'InsufficientBalance' : null } |
  { 'InvalidApprovedAccount' : { 'reason' : string } } |
  { 'LedgerUnavailable' : { 'reason' : string } } |
  { 'AllowanceExpiresTooEarly' : null };
export type CheckAssetsEvent = {
    'CheckAccountsAdvance' : { 'sub_account' : Uint8Array | number[] }
  } |
  { 'CheckAssetsFinished' : null } |
  { 'AccountHasApprove' : { 'sub_account' : Uint8Array | number[] } } |
  { 'CheckAssetsStarted' : null } |
  {
    'CheckAccountsPrepared' : { 'sub_accounts' : Array<Uint8Array | number[]> }
  };
export type CheckAssetsState = { 'CheckAccountsForNoApprovePrepare' : null } |
  { 'FinishCheckAssets' : null } |
  {
    'CheckAccountsForNoApproveSequential' : {
      'sub_accounts' : Array<Uint8Array | number[]>,
    }
  } |
  { 'StartCheckAssets' : null };
export type CheckPermissionStrategy = { 'CheckCallerIsDeployer' : null } |
  { 'CheckContractActivationCode' : { 'code' : string } };
export interface ChunkDef { 'count' : bigint, 'start' : bigint }
export interface CompletedSaleDeal {
  'assets' : Timestamped_4,
  'buyer_account' : LedgerAccount,
  'seller' : Principal,
  'seller_transfer' : Timestamped_2,
  'buyer' : Principal,
  'seller_account' : LedgerAccount,
  'price' : bigint,
}
export interface ConfirmAuthnMethodRegistrationError {
  'retries_left' : number,
  'verification_code' : string,
}
export interface ConfirmHolderAuthnMethodRegistrationArgs {
  'frontend_hostname' : string,
}
export interface ConfirmOwnerAuthnMethodRegistrationArgs {
  'verification_code' : string,
}
export interface ContractCertificate {
  'deployer' : Principal,
  'contract_canister' : Principal,
  'hub_canister' : Principal,
  'contract_wasm_hash' : string,
  'expiration' : bigint,
  'contract_template_id' : bigint,
}
export interface DefiniteCanisterSettings {
  'freezing_threshold' : bigint,
  'wasm_memory_threshold' : bigint,
  'environment_variables' : Array<EnvironmentVariable>,
  'controllers' : Array<Principal>,
  'reserved_cycles_limit' : bigint,
  'log_visibility' : LogVisibility,
  'wasm_memory_limit' : bigint,
  'memory_allocation' : bigint,
  'compute_allocation' : bigint,
}
export interface DelayedTimestampMillis { 'time' : bigint, 'delay' : bigint }
export interface DelegationData {
  'signature' : [] | [Uint8Array | number[]],
  'public_key' : Uint8Array | number[],
  'hostname' : string,
  'timestamp' : bigint,
}
export type DelegationState = {
    'NeedPrepareDelegation' : { 'hostname' : string }
  } |
  {
    'GetDelegationWaiting' : {
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }
  };
export interface EnvironmentVariable { 'value' : string, 'name' : string }
export type FetchAssetsEvent = {
    'NeuronsInformationGot' : {
      'hk_neurons' : Array<NeuronAsset>,
      'ctrl_neurons' : Array<[NeuronAsset, Array<Principal>]>,
    }
  } |
  { 'NeuronsInformationObtained' : null } |
  {
    'NeuronsInformationGotEmpty' : { 'neuron_ids' : BigUint64Array | bigint[] }
  } |
  { 'NeuronsIdsGot' : { 'neuron_ids' : BigUint64Array | bigint[] } } |
  { 'AccountsBalancesObtained' : null } |
  {
    'NeuronHotkeyDeleted' : {
      'hot_key' : Principal,
      'failed' : [] | [string],
      'neuron_id' : bigint,
    }
  } |
  { 'TooManyNeurons' : null } |
  { 'ObtainDelegation' : { 'event' : ObtainDelegationEvent } } |
  { 'AllNeuronsHotkeysDeleted' : null } |
  {
    'AccountBalanceObtained' : {
      'balance' : bigint,
      'account_identifier' : Uint8Array | number[],
    }
  } |
  { 'TooManyAccounts' : null } |
  {
    'AccountsInformationGot' : {
      'accounts_information' : [] | [AccountsInformation],
    }
  } |
  { 'FetchAssetsStarted' : { 'fetch_assets_state' : FetchAssetsState } } |
  { 'FetchAssetsFinished' : null };
export type FetchAssetsState = { 'FinishFetchAssets' : null } |
  {
    'ObtainDelegationState' : {
      'sub_state' : DelegationState,
      'wrap_fetch_state' : FetchAssetsState,
    }
  } |
  { 'FetchNnsAssetsState' : { 'sub_state' : FetchNnsAssetsState } } |
  { 'StartFetchAssets' : null };
export type FetchNnsAssetsState = { 'GetNeuronsIds' : null } |
  {
    'GetNeuronsInformation' : {
      'neuron_hotkeys' : Array<[bigint, Array<Principal>]>,
    }
  } |
  {
    'DeletingNeuronsHotkeys' : {
      'neuron_hotkeys' : Array<[bigint, Array<Principal>]>,
    }
  } |
  { 'GetAccountsInformation' : null } |
  { 'GetAccountsBalances' : null };
export type GeHolderEventsResponse = { 'Ok' : GetHolderEventsResult };
export type GetCanisterMetricsError = { 'PermissionDenied' : null };
export type GetCanisterMetricsResponse = { 'Ok' : GetCanisterMetricsResult } |
  { 'Err' : GetCanisterMetricsError };
export interface GetCanisterMetricsResult { 'metrics' : CanisterMetrics }
export type GetCanisterStatusError = {
    'ManagementCallError' : { 'reason' : string }
  };
export type GetCanisterStatusResponse = { 'Ok' : GetCanisterStatusResult } |
  { 'Err' : GetCanisterStatusError };
export interface GetCanisterStatusResult {
  'canister_status_response' : CanisterStatusResult,
}
export type GetContractCertificateError = {
    'ContractCallError' : { 'reason' : string }
  };
export type GetContractCertificateResponse = {
    'Ok' : GetContractCertificateResult
  } |
  { 'Err' : GetContractCertificateError };
export interface GetContractCertificateResult {
  'certificate' : SignedContractCertificate,
}
export type GetContractOwnerError = { 'ContractNotActivated' : null } |
  { 'ContractActivationNotRequired' : null };
export type GetContractOwnerResponse = { 'Ok' : GetContractOwnerResult } |
  { 'Err' : GetContractOwnerError };
export interface GetContractOwnerResult { 'owner' : Principal }
export interface GetHolderEventsArgs {
  'sorting' : [] | [SortingDefinition],
  'chunk_def' : ChunkDef,
}
export interface GetHolderEventsResult {
  'events' : Array<IdentifiedHolderProcessingEvent>,
  'total_count' : bigint,
}
export type GetHolderInformationResponse = { 'Ok' : ProcessHolderResult };
export interface HolderAssets {
  'controlled_neurons' : [] | [Timestamped_1],
  'accounts' : [] | [Timestamped_3],
}
export interface HolderInformation {
  'identity_name' : [] | [string],
  'completed_sale_deal' : [] | [CompletedSaleDeal],
  'update_version' : bigint,
  'holding_timestamp' : [] | [bigint],
  'owner' : [] | [Principal],
  'assets' : [] | [Timestamped_4],
  'sale_deal' : [] | [SaleDeal],
  'processing_error' : [] | [Timestamped_6],
  'schedule_processing' : [] | [DelayedTimestampMillis],
  'state' : HolderState,
  'canister_cycles_state' : CanisterCyclesState,
  'fetching_assets' : [] | [HolderAssets],
  'identity_number' : [] | [bigint],
}
export type HolderProcessingError = { 'UpdateHolderError' : null } |
  { 'IcAgentError' : { 'error' : string, 'retry_delay' : [] | [bigint] } } |
  { 'DelegationExpired' : null } |
  { 'InternalError' : { 'error' : string } };
export type HolderProcessingEvent = {
    'DelayAddContractController' : { 'time' : bigint }
  } |
  { 'Capturing' : { 'event' : CaptureProcessingEvent } } |
  { 'AllowAddContractController' : null } |
  { 'Releasing' : { 'event' : ReleaseProcessingEvent } } |
  { 'StartCaptureIdentity' : { 'identity_number' : bigint } } |
  { 'ProcessingError' : { 'error' : HolderProcessingError } } |
  { 'ContractActivated' : GetContractOwnerResult } |
  { 'Holding' : { 'event' : HoldingProcessingEvent } };
export type HolderState = {
    'Release' : {
      'sub_state' : ReleaseState,
      'release_initiation' : ReleaseInitiation,
    }
  } |
  { 'Closed' : { 'unsellable_reason' : [] | [UnsellableReason] } } |
  { 'WaitingStartCapture' : null } |
  { 'Capture' : { 'sub_state' : CaptureState } } |
  { 'Holding' : { 'sub_state' : HoldingState } } |
  { 'WaitingActivation' : null };
export type HoldingProcessingEvent = {
    'CheckAssets' : { 'event' : CheckAssetsEvent }
  } |
  { 'QuarantineCompleted' : null } |
  { 'FetchAssets' : { 'event' : FetchAssetsEvent } } |
  { 'SellableExpired' : null } |
  { 'AssetsValidated' : null } |
  { 'StartRelease' : null } |
  { 'HoldingStarted' : { 'quarantine_completion_time' : bigint } } |
  { 'HoldingStartExpired' : null } |
  { 'ValidateAssetsFailed' : { 'reason' : string } } |
  { 'SaleDeal' : { 'event' : SaleDealProcessingEvent } };
export type HoldingState = {
    'CheckAssets' : {
      'sub_state' : CheckAssetsState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  {
    'CancelSaleDeal' : {
      'sub_state' : CancelSaleDealState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  {
    'Hold' : {
      'quarantine' : [] | [bigint],
      'sale_deal_state' : [] | [SaleDealState],
    }
  } |
  {
    'FetchAssets' : {
      'fetch_assets_state' : FetchAssetsState,
      'wrap_holding_state' : HoldingState,
    }
  } |
  { 'Unsellable' : { 'reason' : UnsellableReason } } |
  { 'ValidateAssets' : { 'wrap_holding_state' : HoldingState } } |
  { 'StartHolding' : null };
export interface HttpHeader { 'value' : string, 'name' : string }
export interface HttpRequestResult {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<HttpHeader>,
}
export interface IdentifiedHolderProcessingEvent {
  'id' : bigint,
  'time' : bigint,
  'event' : HolderProcessingEvent,
}
export type IdentityEventsSortingKey = { 'Created' : null };
export interface InitContractArgs {
  'certificate' : SignedContractCertificate,
  'contract_activation_code_hash' : [] | [Uint8Array | number[]],
  'root_public_key_raw' : Uint8Array | number[],
}
export type LedgerAccount = {
    'Account' : {
      'owner' : Principal,
      'subaccount' : [] | [Uint8Array | number[]],
    }
  } |
  { 'AccountIdentifier' : { 'slice' : Uint8Array | number[] } };
export type LimitFailureReason = { 'TooManyNeurons' : null } |
  { 'TooManyAccounts' : null };
export type LogVisibility = { 'controllers' : null } |
  { 'public' : null } |
  { 'allowed_viewers' : Array<Principal> };
export interface MemoryMetrics {
  'wasm_binary_size' : bigint,
  'wasm_chunk_store_size' : bigint,
  'canister_history_size' : bigint,
  'stable_memory_size' : bigint,
  'snapshots_size' : bigint,
  'wasm_memory_size' : bigint,
  'global_memory_size' : bigint,
  'custom_sections_size' : bigint,
}
export interface NeuronAsset {
  'info' : [] | [Timestamped],
  'neuron_id' : bigint,
}
export interface NeuronInformation {
  'staked_maturity_e8s_equivalent' : [] | [bigint],
  'controller' : [] | [Principal],
  'voting_power_refreshed_timestamp_seconds' : [] | [bigint],
  'kyc_verified' : boolean,
  'potential_voting_power' : [] | [bigint],
  'neuron_type' : [] | [number],
  'not_for_profit' : boolean,
  'maturity_e8s_equivalent' : bigint,
  'deciding_voting_power' : [] | [bigint],
  'cached_neuron_stake_e8s' : bigint,
  'created_timestamp_seconds' : bigint,
  'auto_stake_maturity' : [] | [boolean],
  'aging_since_timestamp_seconds' : bigint,
  'account' : Uint8Array | number[],
  'joined_community_fund_timestamp_seconds' : [] | [bigint],
  'neuron_information_extended' : [] | [NeuronInformationExtended],
  'neuron_fees_e8s' : bigint,
  'visibility' : [] | [number],
  'known_neuron_name' : [] | [string],
}
export interface NeuronInformationExtended {
  'dissolve_delay_seconds' : bigint,
  'state' : number,
  'age_seconds' : bigint,
}
export type ObtainDelegationEvent = { 'RetryPrepareDelegation' : null } |
  { 'DelegationGot' : { 'delegation_data' : DelegationData } } |
  {
    'DelegationPrepared' : {
      'delegation_data' : DelegationData,
      'get_delegation_request' : QueryCanisterSignedRequest,
    }
  } |
  { 'DelegationLost' : null };
export type ProcessHolderResponse = { 'Ok' : ProcessHolderResult };
export interface ProcessHolderResult {
  'holder_information' : HolderInformation,
}
export interface QueryCanisterSignedRequest {
  'request_sign' : Uint8Array | number[],
  'canister_id' : Principal,
}
export interface QueryStats {
  'response_payload_bytes_total' : bigint,
  'num_instructions_total' : bigint,
  'num_calls_total' : bigint,
  'request_payload_bytes_total' : bigint,
}
export interface ReceiveDelegationArgs {
  'get_delegation_response' : Uint8Array | number[],
}
export type ReceiveDelegationError = {
    'ResponseNotContainsDelegation' : null
  } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'DelegationWrong' : { 'reason' : string } };
export type ReceiveDelegationResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : ReceiveDelegationError };
export interface ReferralRewardData {
  'memo' : bigint,
  'account' : LedgerAccount,
}
export type ReleaseError = {
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : null
  } |
  { 'AuthnMethodRegistrationModeEnterAlreadyInProgress' : null } |
  {
    'AuthnMethodRegistrationModeEnterInvalidRegistrationId' : {
      'error' : string,
    }
  } |
  { 'AuthnMethodRegistrationExpired' : null };
export type ReleaseInitiation = { 'DangerousToLoseIdentity' : null } |
  { 'IdentityAPIChanged' : null } |
  { 'Manual' : { 'unsellable_reason' : [] | [UnsellableReason] } };
export type ReleaseProcessingEvent = {
    'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered' : null
  } |
  { 'ReleaseRestarted' : { 'registration_id' : [] | [string] } } |
  { 'OrphanedAuthnRegistrationModeUnauthorized' : null } |
  { 'DeleteHolderAuthnMethod' : null } |
  { 'OrphanedAuthnRegistrationModeExited' : null } |
  {
    'AuthnMethodRegistrationModeEntered' : {
      'expiration' : bigint,
      'registration_id' : string,
    }
  } |
  { 'HolderAuthnMethodNotFound' : null } |
  { 'AuthnMethodRegistrationModeOff' : null } |
  { 'AuthnMethodRegistrationModeEnterUnathorized' : null } |
  {
    'ConfirmAuthnMethodRegistration' : ConfirmOwnerAuthnMethodRegistrationArgs
  } |
  { 'ReleaseStarted' : null } |
  { 'AuthnMethodRegistrationNotRegistered' : null } |
  { 'AuthnMethodRegistrationConfirmed' : null } |
  { 'AuthnMethodRegistrationModeEnterFail' : { 'error' : ReleaseError } } |
  { 'AuthnMethodRegistrationExpired' : null } |
  { 'AuthnMethodRegistrationWrongCode' : ConfirmAuthnMethodRegistrationError } |
  { 'HolderAuthnMethodDeleted' : null };
export type ReleaseState = { 'DangerousToLoseIdentity' : null } |
  { 'IdentityAPIChanged' : null } |
  { 'DeleteHolderAuthnMethod' : null } |
  { 'StartRelease' : null } |
  {
    'ConfirmAuthnMethodRegistration' : {
      'expiration' : bigint,
      'verification_code' : string,
      'registration_id' : string,
    }
  } |
  { 'ReleaseFailed' : { 'error' : ReleaseError } } |
  { 'EnterAuthnMethodRegistrationMode' : RestartReleaseIdentityArgs } |
  {
    'WaitingAuthnMethodRegistration' : {
      'expiration' : bigint,
      'confirm_error' : [] | [ConfirmAuthnMethodRegistrationError],
      'registration_id' : string,
    }
  } |
  { 'EnsureOrphanedRegistrationExited' : RestartReleaseIdentityArgs } |
  { 'CheckingAccessFromOwnerAuthnMethod' : null };
export interface RestartReleaseIdentityArgs {
  'registration_id' : [] | [string],
}
export type RetryPrepareDelegationError = {
    'HolderLocked' : { 'lock' : DelayedTimestampMillis }
  } |
  { 'HolderWrongState' : null };
export type RetryPrepareDelegationResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : RetryPrepareDelegationError };
export interface SaleDeal {
  'receiver_account' : LedgerAccount,
  'offers' : Array<Timestamped_5>,
  'sale_price' : [] | [Timestamped_2],
  'expiration_time' : bigint,
}
export type SaleDealAcceptSubState = { 'TransferDeveloperReward' : null } |
  { 'StartAccept' : null } |
  { 'TransferHubReward' : null } |
  { 'ResolveReferralRewardData' : null } |
  { 'TransferSaleDealAmountToSellerAccount' : null } |
  { 'TransferReferralReward' : { 'reward_data' : [] | [ReferralRewardData] } } |
  { 'TransferSaleDealAmountToTransitAccount' : null };
export type SaleDealProcessingEvent = {
    'SaleDealAmountToTransitTransferred' : { 'block_index' : [] | [bigint] }
  } |
  { 'SetSaleOffer' : { 'price' : bigint } } |
  {
    'SaleDealAmountToSellerTransferred' : {
      'seller_amount' : bigint,
      'transfer' : [] | [TransferInformation],
    }
  } |
  { 'CertificateExpired' : null } |
  { 'ChangeSaleIntention' : ChangeSaleIntentionArgs } |
  {
    'BuyerFromTransitAccountRefunded' : {
      'buyer' : Principal,
      'refund' : [] | [TransferInformation],
    }
  } |
  { 'RefundBuyerFromTransitAccount' : { 'buyer' : Principal } } |
  { 'CancelBuyerOffer' : { 'buyer' : Principal } } |
  {
    'DeveloperRewardTransferred' : { 'transfer' : [] | [TransferInformation] }
  } |
  { 'SaleDealAcceptStarted' : null } |
  { 'TransferSaleDealAmountToTransitFailed' : { 'reason' : string } } |
  { 'ReferralRewardDataResolvingFailed' : { 'reason' : string } } |
  {
    'AcceptSellerOffer' : {
      'referral' : [] | [string],
      'previous_referral' : [] | [string],
      'expiration' : bigint,
      'buyer' : Principal,
      'price' : bigint,
      'approved_account' : LedgerAccount,
    }
  } |
  { 'SaleIntentionExpired' : null } |
  {
    'RemoveFailedBuyerOffer' : { 'offer_amount' : bigint, 'buyer' : Principal }
  } |
  {
    'SetBuyerOffer' : {
      'referral' : [] | [string],
      'previous_referral' : [] | [string],
      'offer_amount' : bigint,
      'expiration' : bigint,
      'buyer' : Principal,
      'max_buyer_offers' : bigint,
      'approved_account' : LedgerAccount,
    }
  } |
  { 'HubRewardTransferred' : { 'transfer' : [] | [TransferInformation] } } |
  { 'SaleDealCanceled' : null } |
  { 'CancelSaleIntention' : null } |
  {
    'ReferralRewardTransferred' : { 'transfer' : [] | [TransferInformation] }
  } |
  {
    'ReferralRewardDataResolved' : { 'reward_data' : [] | [ReferralRewardData] }
  } |
  { 'AcceptBuyerOffer' : { 'offer_amount' : bigint, 'buyer' : Principal } } |
  {
    'SetSaleIntention' : {
      'receiver_account' : LedgerAccount,
      'sale_deal_expiration_time' : bigint,
    }
  };
export type SaleDealState = {
    'Accept' : { 'sub_state' : SaleDealAcceptSubState, 'buyer' : Principal }
  } |
  { 'Trading' : null } |
  { 'WaitingSellOffer' : null };
export interface SetBuyerOfferArgs {
  'referral' : [] | [string],
  'offer_amount' : bigint,
  'approved_account' : LedgerAccount,
}
export type SetBuyerOfferError = { 'OfferAmountExceedsPrice' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'OfferAmountTooLow' : { 'min_sell_price_inclusively' : bigint } } |
  { 'CheckApprovedBalanceError' : { 'error' : CheckApprovedBalanceError } } |
  { 'InvalidReferral' : null };
export type SetBuyerOfferResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : SetBuyerOfferError };
export interface SetSaleIntentionArgs { 'receiver_account' : LedgerAccount }
export type SetSaleIntentionError = { 'PermissionDenied' : null } |
  { 'CertificateExpirationImminent' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'InvalidAccountIdentifier' : null };
export type SetSaleIntentionResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : SetSaleIntentionError };
export interface SetSaleOfferArgs { 'price' : bigint }
export type SetSaleOfferError = { 'HigherBuyerOfferExists' : null } |
  { 'PermissionDenied' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null } |
  { 'PriceTooLow' : { 'min_sell_price_inclusively' : bigint } };
export type SetSaleOfferResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : SetSaleOfferError };
export interface SignedContractCertificate {
  'signature' : Uint8Array | number[],
  'contract_certificate' : ContractCertificate,
}
export interface SortingDefinition {
  'key' : IdentityEventsSortingKey,
  'order' : SortingOrder,
}
export type SortingOrder = { 'Descending' : null } |
  { 'Ascending' : null };
export interface StartCaptureIdentityArgs { 'identity_number' : bigint }
export type StartCaptureIdentityError = { 'PermissionDenied' : null } |
  { 'CertificateExpirationImminent' : null } |
  { 'HolderLocked' : { 'lock' : DelayedTimestampMillis } } |
  { 'HolderWrongState' : null };
export type StartCaptureIdentityResponse = { 'Ok' : ProcessHolderResult } |
  { 'Err' : StartCaptureIdentityError };
export interface SubAccountInformation {
  'sub_account_information' : AccountInformation,
  'name' : string,
  'sub_account' : Uint8Array | number[],
}
export interface Timestamped {
  'value' : NeuronInformation,
  'timestamp' : bigint,
}
export interface Timestamped_1 {
  'value' : Array<NeuronAsset>,
  'timestamp' : bigint,
}
export interface Timestamped_2 { 'value' : bigint, 'timestamp' : bigint }
export interface Timestamped_3 {
  'value' : [] | [AccountsInformation],
  'timestamp' : bigint,
}
export interface Timestamped_4 { 'value' : HolderAssets, 'timestamp' : bigint }
export interface Timestamped_5 { 'value' : BuyerOffer, 'timestamp' : bigint }
export interface Timestamped_6 {
  'value' : HolderProcessingError,
  'timestamp' : bigint,
}
export interface TransferInformation {
  'block_index' : bigint,
  'receiver_account_hex' : string,
  'amount' : bigint,
}
export interface TransformArgs {
  'context' : Uint8Array | number[],
  'response' : HttpRequestResult,
}
export type UnsellableReason = { 'ValidationFailed' : { 'reason' : string } } |
  { 'CertificateExpired' : null } |
  { 'CheckLimitFailed' : { 'reason' : LimitFailureReason } } |
  { 'ApproveOnAccount' : { 'sub_account' : Uint8Array | number[] } } |
  { 'SaleDealCompleted' : null };
export interface _SERVICE {
  'accept_buyer_offer' : ActorMethod<
    [AcceptBuyerOfferArgs],
    AcceptBuyerOfferResponse
  >,
  'accept_seller_offer' : ActorMethod<
    [AcceptSellerOfferArgs],
    AcceptSellerOfferResponse
  >,
  'activate_contract' : ActorMethod<
    [ActivateContractArgs],
    ActivateContractResponse
  >,
  'add_contract_controller' : ActorMethod<
    [AddContractControllerArgs],
    AddContractControllerResponse
  >,
  'cancel_buyer_offer' : ActorMethod<[{}], CancelBuyerOfferResponse>,
  'cancel_capture_identity' : ActorMethod<[{}], CancelCaptureIdentityResponse>,
  'cancel_sale_intention' : ActorMethod<[{}], CancelSaleIntentionResponse>,
  'change_sale_intention' : ActorMethod<
    [ChangeSaleIntentionArgs],
    ChangeSaleIntentionResponse
  >,
  'confirm_holder_authn_method_registration' : ActorMethod<
    [ConfirmHolderAuthnMethodRegistrationArgs],
    CancelSaleIntentionResponse
  >,
  'confirm_owner_authn_method_registration' : ActorMethod<
    [ConfirmOwnerAuthnMethodRegistrationArgs],
    CancelSaleIntentionResponse
  >,
  'delete_holder_authn_method' : ActorMethod<[{}], CancelSaleIntentionResponse>,
  'get_canister_metrics' : ActorMethod<[{}], GetCanisterMetricsResponse>,
  'get_canister_status' : ActorMethod<[], GetCanisterStatusResponse>,
  'get_contract_certificate' : ActorMethod<
    [{}],
    GetContractCertificateResponse
  >,
  'get_contract_owner' : ActorMethod<[{}], GetContractOwnerResponse>,
  'get_holder_events' : ActorMethod<
    [GetHolderEventsArgs],
    GeHolderEventsResponse
  >,
  'get_holder_information' : ActorMethod<[{}], GetHolderInformationResponse>,
  'get_holder_information_query' : ActorMethod<
    [{}],
    GetHolderInformationResponse
  >,
  'process_holder' : ActorMethod<[{}], ProcessHolderResponse>,
  'protected_authn_method_deleted' : ActorMethod<
    [{}],
    CancelSaleIntentionResponse
  >,
  'receive_delegation' : ActorMethod<
    [ReceiveDelegationArgs],
    ReceiveDelegationResponse
  >,
  'restart_release_identity' : ActorMethod<
    [RestartReleaseIdentityArgs],
    CancelSaleIntentionResponse
  >,
  'retry_prepare_delegation' : ActorMethod<
    [{}],
    RetryPrepareDelegationResponse
  >,
  'set_buyer_offer' : ActorMethod<[SetBuyerOfferArgs], SetBuyerOfferResponse>,
  'set_sale_intention' : ActorMethod<
    [SetSaleIntentionArgs],
    SetSaleIntentionResponse
  >,
  'set_sale_offer' : ActorMethod<[SetSaleOfferArgs], SetSaleOfferResponse>,
  'start_capture_identity' : ActorMethod<
    [StartCaptureIdentityArgs],
    StartCaptureIdentityResponse
  >,
  'start_release_identity' : ActorMethod<[{}], CancelSaleIntentionResponse>,
  'transform_http_response' : ActorMethod<[TransformArgs], HttpRequestResult>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
