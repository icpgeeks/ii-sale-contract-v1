import type {Principal} from '@dfinity/principal';
import type {CanisterOptions} from '@dfinity/utils';
import {Canister, createServices} from '@dfinity/utils';
import {
    type _SERVICE,
    type AcceptBuyerOfferArgs,
    type AcceptSellerOfferArgs,
    type ActivateContractArgs,
    type AddContractControllerArgs,
    type ChangeSaleIntentionArgs,
    type ConfirmHolderAuthnMethodRegistrationArgs,
    type ConfirmOwnerAuthnMethodRegistrationArgs,
    type GetHolderEventsArgs,
    idlFactory,
    type ReceiveDelegationArgs,
    type RestartReleaseIdentityArgs,
    type SetBuyerOfferArgs,
    type SetSaleIntentionArgs,
    type SetSaleOfferArgs,
    type StartCaptureIdentityArgs
} from 'src/declarations/contract/contract.did.js';

type ContractService = _SERVICE;

interface ContractCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
    canisterId: Principal;
}

export class ContractCanister extends Canister<ContractService> {
    static create(options: ContractCanisterOptions<ContractService>) {
        const {service, certifiedService, canisterId} = createServices<ContractService>({
            options: {
                ...options,
                callTransform: undefined,
                queryTransform: undefined
            },
            idlFactory,
            certifiedIdlFactory: idlFactory
        });

        return new ContractCanister(canisterId, service, certifiedService);
    }

    cancelCaptureIdentity = async () => {
        return await this.caller({}).cancel_capture_identity({});
    };

    changeSaleIntention = async (params: ChangeSaleIntentionArgs) => {
        return await this.caller({}).change_sale_intention(params);
    };

    acceptSellerOffer = async (params: AcceptSellerOfferArgs) => {
        return await this.caller({}).accept_seller_offer(params);
    };

    setBuyerOffer = async (params: SetBuyerOfferArgs) => {
        return await this.caller({}).set_buyer_offer(params);
    };

    confirmHolderAuthnMethodRegistration = async (params: ConfirmHolderAuthnMethodRegistrationArgs) => {
        return await this.caller({}).confirm_holder_authn_method_registration(params);
    };

    protectedAuthnMethodDeleted = async () => {
        return await this.caller({}).protected_authn_method_deleted({});
    };

    acceptBuyerOffer = async (params: AcceptBuyerOfferArgs) => {
        return await this.caller({}).accept_buyer_offer(params);
    };

    addContractController = async (params: AddContractControllerArgs) => {
        return await this.caller({}).add_contract_controller(params);
    };

    cancelBuyerOffer = async () => {
        return await this.caller({}).cancel_buyer_offer({});
    };

    cancelSaleIntention = async () => {
        return await this.caller({}).cancel_sale_intention({});
    };

    setSaleIntention = async (params: SetSaleIntentionArgs) => {
        return await this.caller({}).set_sale_intention(params);
    };

    setSaleOffer = async (params: SetSaleOfferArgs) => {
        return await this.caller({}).set_sale_offer(params);
    };

    startReleaseIdentity = async () => {
        return await this.caller({}).start_release_identity({});
    };

    confirmOwnerAuthnMethodRegistration = async (params: ConfirmOwnerAuthnMethodRegistrationArgs) => {
        return await this.caller({}).confirm_owner_authn_method_registration(params);
    };

    deleteHolderAuthnMethod = async () => {
        return await this.caller({}).delete_holder_authn_method({});
    };

    restartReleaseIdentity = async (params: RestartReleaseIdentityArgs) => {
        return await this.caller({}).restart_release_identity(params);
    };

    startCaptureIdentity = async (params: StartCaptureIdentityArgs) => {
        return await this.caller({}).start_capture_identity(params);
    };

    activateContract = async (params: ActivateContractArgs) => {
        return await this.caller({}).activate_contract(params);
    };
}

export class ContractAnonymousCanister extends Canister<ContractService> {
    static create(options: ContractCanisterOptions<ContractService>) {
        const {service, certifiedService, canisterId} = createServices<ContractService>({
            options: {
                ...options,
                callTransform: undefined,
                queryTransform: undefined
            },
            idlFactory,
            certifiedIdlFactory: idlFactory
        });

        return new ContractAnonymousCanister(canisterId, service, certifiedService);
    }

    getContractCertificate = async () => {
        return await this.caller({}).get_contract_certificate({});
    };

    getCanisterStatus = async () => {
        return await this.caller({}).get_canister_status();
    };

    getHolderEvents = async (params: GetHolderEventsArgs) => {
        return await this.caller({}).get_holder_events(params);
    };

    getHolderInformation = async () => {
        return await this.caller({}).get_holder_information({});
    };

    receiveDelegation = async (params: ReceiveDelegationArgs) => {
        return await this.caller({}).receive_delegation(params);
    };

    retryPrepareDelegation = async () => {
        return await this.caller({}).retry_prepare_delegation({});
    };
}
