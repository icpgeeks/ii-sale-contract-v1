import type {CaptureState, HolderState, HoldingState, ReleaseState} from 'src/declarations/contract/contract.did';
import type {KeysOfUnion, TransformUnion} from '../../utils/core/typescript/typescriptAddons';

export type HolderStateUnion = TransformUnion<HolderState>;
export type HolderStateUnionType = HolderStateUnion['type'];

type HolderCaptureSubStateUnion = TransformUnion<CaptureState>;
export type HolderCaptureSubStateUnionType = HolderCaptureSubStateUnion['type'];

export type HolderHoldingSubStateUnion = TransformUnion<HoldingState>;
export type HolderHoldingSubStateUnionType = HolderHoldingSubStateUnion['type'];

type HolderReleaseSubStateUnion = TransformUnion<ReleaseState>;
export type HolderReleaseSubStateUnionType = HolderReleaseSubStateUnion['type'];

export type ExtractHolderSubStates<K extends KeysOfUnion<HolderState>> = {
    [P in K]: Extract<HolderState, Record<P, {sub_state: any}>>[P]['sub_state'];
};

export type ExtractHolderSubStateUnionKeys<K extends KeysOfUnion<HolderState>> = {
    [P in K]: KeysOfUnion<ExtractHolderSubStates<K>[P]>;
};
