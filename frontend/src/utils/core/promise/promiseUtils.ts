/**
 * Returns a promise that resolves after the given duration.
 * @param {number} durationMillis Duration in milliseconds.
 */
export function delayPromise(durationMillis: number) {
    return new Promise((resolve) => setTimeout(resolve, durationMillis));
}
