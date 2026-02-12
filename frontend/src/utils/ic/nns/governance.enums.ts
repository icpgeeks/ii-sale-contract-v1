/**
 * @see https://github.com/dfinity/icp-js-canisters/blob/main/packages/nns/src/enums/governance.enums.ts
 */
export enum NeuronState {
    Unspecified = 0,
    Locked = 1,
    Dissolving = 2,
    Dissolved = 3,
    Spawning = 4
}

export enum NeuronVisibility {
    Unspecified = 0,
    Private = 1,
    Public = 2
}

export enum NeuronType {
    // Placeholder value due to the proto3 requirement for a zero default.
    // This is an invalid type; neurons should not be assigned this value.
    Unspecified = 0,
    // Represents neurons initially created for Seed accounts in the
    // Genesis Token Canister, or those descended from such neurons.
    Seed = 1,
    // Represents neurons initially created for Early Contributor Token (ECT)
    // accounts in the Genesis Token Canister, or those descended from such neurons.
    Ect = 2
}
