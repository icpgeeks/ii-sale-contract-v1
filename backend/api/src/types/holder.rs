use candid::{CandidType, Principal};
use common_canister_types::{
    components::identity::OpenIdCredentialKey, DelayedTimestampMillis, LedgerAccount,
    QueryCanisterSignedRequest, TimestampMillis, TimestampNanos, TimestampSeconds, Timestamped,
    TokenE8s, TransactionId, TransferInformation,
};
use serde::{Deserialize, Serialize};

pub type IdentityNumber = u64;
pub type PublicKey = Vec<u8>;

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum HolderState {
    WaitingActivation,
    WaitingStartCapture,
    Capture {
        sub_state: CaptureState,
    },
    Holding {
        sub_state: HoldingState,
    },
    Release {
        release_initiation: ReleaseInitiation,
        sub_state: ReleaseState,
    },
    Closed {
        unsellable_reason: Option<UnsellableReason>,
    },
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum CaptureState {
    StartCapture,
    CreateEcdsaKey,
    RegisterAuthnMethodSession,
    NeedConfirmAuthnMethodSessionRegistration {
        confirmation_code: String,
        expiration: TimestampMillis,
    },
    ExitAndRegisterHolderAuthnMethod {
        frontend_hostname: String,
    },
    GetHolderContractPrincipal {
        frontend_hostname: String,
    },
    NeedDeleteProtectedIdentityAuthnMethod {
        meta_data: Vec<(String, String)>,
        public_key: Vec<u8>,
    },
    ObtainingIdentityAuthnMethods,
    DeletingIdentityAuthnMethods {
        authn_pubkeys: Vec<PublicKey>,
        active_registration: bool,
        openid_credentials: Option<Vec<OpenIdCredentialKey>>,
    },
    FinishCapture,
    CaptureFailed {
        error: CaptureError,
    },
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum HoldingState {
    StartHolding,
    Hold {
        quarantine: Option<TimestampMillis>,
        sale_deal_state: Option<SaleDealState>,
    },
    ValidateAssets {
        wrap_holding_state: Box<HoldingState>,
    },
    FetchAssets {
        fetch_assets_state: FetchAssetsState,
        wrap_holding_state: Box<HoldingState>,
    },
    CheckAssets {
        sub_state: CheckAssetsState,
        wrap_holding_state: Box<HoldingState>,
    },
    CancelSaleDeal {
        sub_state: CancelSaleDealState,
        wrap_holding_state: Box<HoldingState>,
    },
    Unsellable {
        reason: UnsellableReason,
    },
}

impl HoldingState {
    pub fn get_sale_deal_state(&self) -> Option<&SaleDealState> {
        match self {
            HoldingState::StartHolding => None,
            HoldingState::Hold {
                sale_deal_state, ..
            } => sale_deal_state.as_ref(),
            HoldingState::ValidateAssets { wrap_holding_state } => {
                wrap_holding_state.get_sale_deal_state()
            }
            HoldingState::FetchAssets {
                wrap_holding_state, ..
            } => wrap_holding_state.get_sale_deal_state(),
            HoldingState::CheckAssets {
                wrap_holding_state, ..
            } => wrap_holding_state.get_sale_deal_state(),
            HoldingState::CancelSaleDeal { .. } => None,
            HoldingState::Unsellable { .. } => None,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum FetchAssetsState {
    ObtainDelegationState {
        sub_state: DelegationState,
        wrap_fetch_state: Box<FetchAssetsState>,
    },
    StartFetchAssets,
    FetchNnsAssetsState {
        sub_state: FetchNnsAssetsState,
    },
    FinishFetchAssets,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum DelegationState {
    NeedPrepareDelegation {
        hostname: String,
    },
    GetDelegationWaiting {
        get_delegation_request: QueryCanisterSignedRequest,
        delegation_data: DelegationData,
    },
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct DelegationData {
    pub hostname: String,
    pub public_key: PublicKey,
    pub timestamp: TimestampNanos,
    pub signature: Option<Vec<u8>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum FetchNnsAssetsState {
    GetNeuronsIds,
    GetNeuronsInformation {
        neuron_hotkeys: Vec<(NeuronId, Vec<Principal>)>,
    },
    DeletingNeuronsHotkeys {
        neuron_hotkeys: Vec<(NeuronId, Vec<Principal>)>,
    },
    GetAccountsInformation,
    GetAccountsBalances,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum CheckAssetsState {
    StartCheckAssets,
    CheckAccountsForNoApprovePrepare,
    CheckAccountsForNoApproveSequential { sub_accounts: Vec<Vec<u8>> },
    FinishCheckAssets,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum SaleDealState {
    WaitingSellOffer,
    Trading,
    Accept {
        buyer: Principal,
        sub_state: SaleDealAcceptSubState,
    },
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum CancelSaleDealState {
    StartCancelSaleDeal { sale_deal_state: Box<SaleDealState> },
    RefundBuyerFromTransitAccount { buyer: Principal },
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum SaleDealAcceptSubState {
    StartAccept,
    TransferSaleDealAmountToTransitAccount,
    ResolveReferralRewardData,
    TransferReferralReward {
        reward_data: Option<ReferralRewardData>,
    },
    TransferDeveloperReward,
    TransferHubReward,
    TransferSaleDealAmountToSellerAccount,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum UnsellableReason {
    ApproveOnAccount { sub_account: Vec<u8> },
    ValidationFailed { reason: String },
    CheckLimitFailed { reason: LimitFailureReason },
    CertificateExpired,
    SaleDealCompleted,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum LimitFailureReason {
    TooManyNeurons,
    TooManyAccounts,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum ReleaseInitiation {
    Manual {
        unsellable_reason: Option<UnsellableReason>,
    },
    DangerousToLoseIdentity,
    IdentityAPIChanged,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub enum ReleaseState {
    StartRelease,
    EnterAuthnMethodRegistrationMode {
        registration_id: Option<String>,
    },
    WaitingAuthnMethodRegistration {
        expiration: TimestampMillis,
        registration_id: String,
        confirm_error: Option<ConfirmAuthnMethodRegistrationError>,
    },
    ConfirmAuthnMethodRegistration {
        expiration: TimestampMillis,
        registration_id: String,
        verification_code: String,
    },
    EnsureOrphanedRegistrationExited {
        registration_id: Option<String>,
    },
    CheckingAccessFromOwnerAuthnMethod,
    DangerousToLoseIdentity,
    IdentityAPIChanged,
    DeleteHolderAuthnMethod,
    ReleaseFailed {
        error: ReleaseError,
    },
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum CaptureError {
    SessionRegistrationModeOff,
    SessionRegistrationAlreadyInProgress,
    SessionRegistrationModeExpired,
    HolderAuthnMethodRegistrationUnauthorized,
    HolderAuthnMethodRegistrationModeOff,
    InvalidMetadata(String),
    HolderDeviceLost,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum ReleaseError {
    AuthnMethodRegistrationModeEnterAlreadyInProgress,
    AuthnMethodRegistrationModeEnterInvalidRegistrationId { error: String },
    AuthnMethodRegistrationExpired,
    HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ConfirmAuthnMethodRegistrationError {
    pub verification_code: String,
    pub retries_left: u8,
}

/// EVENTS

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum HolderProcessingEvent {
    ContractActivated { owner: Principal },
    StartCaptureIdentity { identity_number: IdentityNumber },
    Capturing { event: CaptureProcessingEvent },
    Holding { event: HoldingProcessingEvent },
    Releasing { event: ReleaseProcessingEvent },
    DelayAddContractController { time: TimestampMillis },
    AllowAddContractController,
    ProcessingError { error: HolderProcessingError },
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum CaptureProcessingEvent {
    CaptureStarted,
    CancelCapture,
    EcdsaKeyCreated {
        ecdsa_key: Vec<u8>,
    },
    AuthnMethodSessionRegistered {
        confirmation_code: String,
        expiration: TimestampMillis,
    },
    AuthnMethodSessionRegisterError {
        error: CaptureError,
    },
    AuthnMethodSessionRegistrationExpired,
    AuthnMethodSessionRegistrationConfirmed {
        frontend_hostname: String,
    },
    HolderAuthnMethodRegistered,
    HolderAuthnMethodRegisterError {
        error: CaptureError,
    },
    HolderContractPrincipalIsHolderOwner,
    HolderContractPrincipalObtained {
        holder_contract_principal: Principal,
    },
    GetHolderContractPrincipalUnathorized,
    HolderAuthnMethodLost,
    IdentityAPIChangeDetected,
    IdentityAuthnMethodProtected {
        meta_data: Vec<(String, String)>,
        public_key: PublicKey,
    },
    IdentityAuthnMethodsObtained {
        authn_pubkeys: Vec<PublicKey>,
        active_registration: bool,
        openid_credentials: Option<Vec<OpenIdCredentialKey>>,
    },
    IdentityAuthnMethodDeleted {
        public_key: Vec<u8>,
    },
    IdentityAuthnMethodRegistrationExited,
    IdentityOpenidCredentialDeleted {
        openid_credential_key: OpenIdCredentialKey,
    },
    ProtectedIdentityAuthnMethodDeleted,
    IdentityAuthnMethodsResync,
    IdentityAuthnMethodsPartiallyDeleted,
    IdentityAuthnMethodsDeleted {
        identity_name: Option<String>,
    },
    CaptureFinished,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum HoldingProcessingEvent {
    FetchAssets {
        event: FetchAssetsEvent,
    },
    CheckAssets {
        event: CheckAssetsEvent,
    },
    HoldingStarted {
        quarantine_completion_time: TimestampMillis,
    },
    HoldingStartExpired,
    QuarantineCompleted,
    AssetsValidated,
    ValidateAssetsFailed {
        reason: String,
    },
    StartRelease,
    SaleDeal {
        event: Box<SaleDealProcessingEvent>,
    },
    SellableExpired,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum FetchAssetsEvent {
    FetchAssetsStarted {
        fetch_assets_state: FetchAssetsState,
    },
    ObtainDelegation {
        event: ObtainDelegationEvent,
    },
    NeuronsIdsGot {
        neuron_ids: Vec<NeuronId>,
    },
    NeuronsInformationGot {
        ctrl_neurons: Vec<(NeuronAsset, Vec<Principal>)>,
        hk_neurons: Vec<NeuronAsset>,
    },
    NeuronsInformationGotEmpty {
        neuron_ids: Vec<NeuronId>,
    },
    TooManyNeurons,
    NeuronsInformationObtained,
    NeuronHotkeyDeleted {
        neuron_id: NeuronId,
        hot_key: Principal,
        failed: Option<String>,
    },
    AllNeuronsHotkeysDeleted,
    AccountsInformationGot {
        accounts_information: Option<AccountsInformation>,
    },
    TooManyAccounts,
    AccountsBalancesObtained,
    AccountBalanceObtained {
        account_identifier: Vec<u8>,
        balance: TokenE8s,
    },
    FetchAssetsFinished,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum ObtainDelegationEvent {
    DelegationPrepared {
        get_delegation_request: QueryCanisterSignedRequest,
        delegation_data: DelegationData,
    },
    RetryPrepareDelegation,
    DelegationGot {
        delegation_data: DelegationData,
    },
    DelegationLost,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct CheckSubaccount {
    pub subaccount: Vec<u8>,
    pub transaction_id: TransactionId,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum CheckAssetsEvent {
    CheckAssetsStarted,
    CheckAccountsPrepared { sub_accounts: Vec<Vec<u8>> },
    CheckAccountsAdvance { sub_account: Vec<u8> },
    AccountHasApprove { sub_account: Vec<u8> },
    CheckAssetsFinished,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum SaleDealProcessingEvent {
    SetSaleIntention {
        sale_deal_expiration_time: TimestampMillis,
        receiver_account: LedgerAccount,
    },
    SetSaleOffer {
        price: TokenE8s,
    },
    ChangeSaleIntention {
        receiver_account: LedgerAccount,
    },
    AcceptBuyerOffer {
        buyer: Principal,
        offer_amount: TokenE8s,
    },
    RemoveFailedBuyerOffer {
        buyer: Principal,
        offer_amount: TokenE8s,
    },
    SetBuyerOffer {
        buyer: Principal,
        approved_account: LedgerAccount,
        referral: Option<String>,
        previous_referral: Option<String>,
        offer_amount: TokenE8s,
        expiration: TimestampMillis,
        max_buyer_offers: usize,
    },
    AcceptSellerOffer {
        buyer: Principal,
        approved_account: LedgerAccount,
        referral: Option<String>,
        previous_referral: Option<String>,
        price: TokenE8s,
        expiration: TimestampMillis,
    },
    CancelBuyerOffer {
        buyer: Principal,
    },
    CancelSaleIntention,
    SaleIntentionExpired,
    CertificateExpired,
    RefundBuyerFromTransitAccount {
        buyer: Principal,
    },
    BuyerFromTransitAccountRefunded {
        buyer: Principal,
        refund: Option<TransferInformation>,
    },
    SaleDealCanceled,
    SaleDealAcceptStarted,
    SaleDealAmountToTransitTransferred {
        block_index: Option<u64>,
    },
    TransferSaleDealAmountToTransitFailed {
        reason: String,
    },
    ReferralRewardDataResolved {
        reward_data: Option<ReferralRewardData>,
    },
    ReferralRewardDataResolvingFailed {
        reason: String,
    },
    ReferralRewardTransferred {
        transfer: Option<TransferInformation>,
    },
    DeveloperRewardTransferred {
        transfer: Option<TransferInformation>,
    },
    HubRewardTransferred {
        transfer: Option<TransferInformation>,
    },
    SaleDealAmountToSellerTransferred {
        seller_amount: TokenE8s,
        transfer: Option<TransferInformation>,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum ReleaseProcessingEvent {
    ReleaseStarted,
    AuthnMethodRegistrationModeEntered {
        expiration: TimestampMillis,
        registration_id: String,
    },
    AuthnMethodRegistrationModeEnterUnathorized,
    AuthnMethodRegistrationModeEnterFail {
        error: ReleaseError,
    },
    AuthnMethodRegistrationExpired,
    ConfirmAuthnMethodRegistration {
        verification_code: String,
    },
    AuthnMethodRegistrationConfirmed,
    AuthnMethodRegistrationModeOff,
    AuthnMethodRegistrationNotRegistered,
    AuthnMethodRegistrationWrongCode {
        verification_code: String,
        retries_left: u8,
    },
    ReleaseRestarted {
        registration_id: Option<String>,
    },
    DeleteHolderAuthnMethod,
    HolderAuthnMethodNotFound,
    HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered,
    HolderAuthnMethodDeleted,
    OrphanedAuthnRegistrationModeExited,
    OrphanedAuthnRegistrationModeUnauthorized,
}

/// Processing errors

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum HolderProcessingError {
    UpdateHolderError,
    DelegationExpired,
    InternalError {
        error: String,
    },
    IcAgentError {
        error: String,
        retry_delay: Option<TimestampMillis>,
    },
}

/// Information

#[derive(CandidType, Deserialize, Debug)]
pub struct HolderInformation {
    pub owner: Option<Principal>,
    pub state: HolderState,
    pub identity_number: Option<IdentityNumber>,
    pub identity_name: Option<String>,
    pub holding_timestamp: Option<TimestampMillis>,
    pub sale_deal: Option<SaleDeal>,
    pub completed_sale_deal: Option<CompletedSaleDeal>,
    pub processing_error: Option<Timestamped<HolderProcessingError>>,
    pub fetching_assets: Option<HolderAssets>,
    pub assets: Option<Timestamped<HolderAssets>>,
    pub schedule_processing: Option<DelayedTimestampMillis>,
    pub update_version: u64,
    pub canister_cycles_state: CanisterCyclesState,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum NeuronDissolveState {
    NotDissolving,
    DissolveDelaySeconds(u64),
    WhenDissolvedTimestampSeconds(u64),
}

pub type NeuronId = u64;
pub type Followees = Vec<NeuronId>;
pub type FolloweesInformation = Vec<(i32, Followees)>;

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NeuronAsset {
    pub neuron_id: NeuronId,
    pub info: Option<Timestamped<NeuronInformation>>,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NeuronInformation {
    pub cached_neuron_stake_e8s: TokenE8s,
    pub maturity_e8s_equivalent: TokenE8s,
    pub staked_maturity_e8s_equivalent: Option<TokenE8s>,
    pub auto_stake_maturity: Option<bool>,
    pub joined_community_fund_timestamp_seconds: Option<TimestampSeconds>,
    pub neuron_fees_e8s: TokenE8s,
    pub neuron_type: Option<i32>,
    pub controller: Option<Principal>,
    pub account: Vec<u8>,
    pub kyc_verified: bool,
    pub not_for_profit: bool,
    pub created_timestamp_seconds: TimestampSeconds,
    pub aging_since_timestamp_seconds: TimestampSeconds,
    pub known_neuron_name: Option<String>,
    pub voting_power_refreshed_timestamp_seconds: Option<u64>,
    pub potential_voting_power: Option<u64>,
    pub deciding_voting_power: Option<u64>,
    pub visibility: Option<i32>,
    pub neuron_information_extended: Option<NeuronInformationExtended>,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NeuronInformationExtended {
    pub dissolve_delay_seconds: u64,
    pub state: i32,
    pub age_seconds: u64,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NeuronStakeTransferInformation {
    pub to_subaccount: Vec<u8>,
    pub neuron_stake_e8s: u64,
    pub from: Option<Principal>,
    pub memo: u64,
    pub from_subaccount: Vec<u8>,
    pub transfer_timestamp: u64,
    pub block_height: u64,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct AccountInformation {
    pub account_identifier: Vec<u8>,
    pub balance: Option<Timestamped<TokenE8s>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct SubAccountInformation {
    pub name: String,
    pub sub_account: Vec<u8>,
    pub sub_account_information: AccountInformation,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct AccountsInformation {
    pub principal: Principal,
    pub main_account_information: Option<AccountInformation>,
    pub sub_accounts: Vec<SubAccountInformation>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct SaleDeal {
    pub expiration_time: TimestampMillis,
    pub sale_price: Option<Timestamped<TokenE8s>>,
    pub receiver_account: LedgerAccount,
    pub offers: Vec<Timestamped<BuyerOffer>>,
}

impl SaleDeal {
    pub fn get_price(&self) -> TokenE8s {
        self.sale_price.as_ref().map(|v| v.value).unwrap_or(0)
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct CompletedSaleDeal {
    pub assets: Timestamped<HolderAssets>,
    pub seller: Principal,
    pub seller_account: LedgerAccount,
    pub buyer: Principal,
    pub buyer_account: LedgerAccount,
    pub price: TokenE8s,
    pub seller_transfer: Timestamped<TokenE8s>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct ReferralRewardData {
    pub account: LedgerAccount,
    pub memo: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct BuyerOffer {
    pub buyer: Principal,
    pub approved_account: LedgerAccount,
    pub referral: Option<String>,
    pub offer_amount: TokenE8s,
}

#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Eq, Debug)]
pub struct HolderAssets {
    pub controlled_neurons: Option<Timestamped<Vec<NeuronAsset>>>,
    pub accounts: Option<Timestamped<Option<AccountsInformation>>>,
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct CanisterCyclesState {
    pub initial_cycles: u128,
    pub warning_threshold_cycles: u128,
    pub critical_threshold_cycles: u128,
    pub current_cycles: u128,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CheckApprovedBalanceError {
    InvalidApprovedAccount { reason: String },
    LedgerUnavailable { reason: String },
    InsufficientBalance,
    InsufficientAllowance,
    AllowanceExpiresTooEarly,
}
