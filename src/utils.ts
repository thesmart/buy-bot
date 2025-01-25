import { createHash } from 'node:crypto';

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function toBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

export function fromBase64(base64: string, encoding: BufferEncoding = 'utf-8'): string {
  return Buffer.from(base64, 'base64').toString(encoding);
}

export function shaChecksum(str: string) {
  const hash = createHash('sha1');
  hash.update(str);
  return hash.digest('hex');
}

export function crcChecksum(str: string) {
  const hash = createHash('shake256', { outputLength: 6 });
  hash.update(str);
  return hash.digest('hex');
}
