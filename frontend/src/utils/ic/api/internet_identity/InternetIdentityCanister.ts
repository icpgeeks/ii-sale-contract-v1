import type {Principal} from '@dfinity/principal';
import type {CanisterOptions} from '@dfinity/utils';
import {Canister, createServices} from '@dfinity/utils';
import {type _SERVICE, idlFactory, type RegistrationId} from './internet_identity.did';

type InternetIdentityService = _SERVICE;

interface InternetIdentityCanisterOptions<T> extends Omit<CanisterOptions<T>, 'canisterId'> {
    canisterId: Principal;
}

export class InternetIdentityAnonymousCanister extends Canister<InternetIdentityService> {
    static create(options: InternetIdentityCanisterOptions<InternetIdentityService>) {
        const {service, certifiedService, canisterId} = createServices<InternetIdentityService>({
            options: {
                ...options,
                callTransform: undefined,
                queryTransform: undefined
            },
            idlFactory,
            certifiedIdlFactory: idlFactory
        });

        return new InternetIdentityAnonymousCanister(canisterId, service, certifiedService);
    }

    lookupByRegistrationModeId = async (registrationId: RegistrationId) => {
        return await this.caller({}).lookup_by_registration_mode_id(registrationId);
    };
}
