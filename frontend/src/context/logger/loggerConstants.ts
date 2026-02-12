export const skipMessage = (logMessagePrefix: string, obj: string) => `${logMessagePrefix} skip - ${obj}`;
export const notAllowedMessage = (logMessagePrefix: string) => `${logMessagePrefix} skip - not allowed`;
export const notOwnerMessage = (logMessagePrefix: string) => `${logMessagePrefix} skip - not owner`;
export const holderLockedMessage = (logMessagePrefix: string) => `${logMessagePrefix} skip - holder locked`;
export const caughtErrorMessage = (logMessagePrefix: string) => `${logMessagePrefix} caught error`;
export const delegationExpiredWillLogoutMessage = 'Delegation expired. Will logout.';
export const exhaustiveCheckFailedMessage = 'Exhaustive check failed.';
