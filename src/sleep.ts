import logger from './logger.js';

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

let shutdownPromise: Promise<void> | undefined;
/**
 * Promise that resolves when the process receives a SIGINT or SIGTERM signal.
 */
export function promiseShutdown(): Promise<void> {
  shutdownPromise ||= new Promise((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
  return shutdownPromise;
}
