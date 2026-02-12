import type {Principal} from '@dfinity/principal';
import type {CanisterOptions, QueryParams} from '@dfinity/utils';
import {Canister, createServices} from '@dfinity/utils';
import {idlFactory, type _SERVICE} from 'src/declarations/hub/hub.did.js';

type HubService = _SERVICE;

interface HubCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
    canisterId: Principal;
}

type GetContractTemplateArgs = {contractTemplateId: bigint};
type GetContractTemplateParams = GetContractTemplateArgs & QueryParams;

export class HubAnonymousCanister extends Canister<HubService> {
    static create(options: HubCanisterOptions<HubService>) {
        const {service, certifiedService, canisterId} = createServices<HubService>({
            options: {
                ...options,
                callTransform: undefined,
                queryTransform: undefined
            },
            idlFactory,
            certifiedIdlFactory: idlFactory
        });

        return new HubAnonymousCanister(canisterId, service, certifiedService);
    }

    getContractTemplate = async (params: GetContractTemplateParams) => {
        return await this.caller(params).get_contract_template({contract_template_id: params.contractTemplateId});
    };
}
