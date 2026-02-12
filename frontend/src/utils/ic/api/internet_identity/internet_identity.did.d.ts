import type {ActorMethod} from '@dfinity/agent';
import type {IDL} from '@dfinity/candid';

export type IdentityNumber = bigint;
export type RegistrationId = string;
export interface _SERVICE {
    lookup_by_registration_mode_id: ActorMethod<[RegistrationId], [] | [IdentityNumber]>;
}
export declare const idlFactory: IDL.InterfaceFactory;
