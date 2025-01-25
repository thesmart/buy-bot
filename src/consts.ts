import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

// repo sources root
export const ROOT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../');
process.env.ROOT_PATH = ROOT_PATH;
export const DATA_PATH = path.join(ROOT_PATH, 'data');
process.env.DATA_PATH = DATA_PATH;

// Read configuration env file from DOTENV_CONFIG_PATH or ROOT_PATH.
export const DOTENV_CONFIG_PATH =
  process.env.DOTENV_CONFIG_PATH || path.join(ROOT_PATH, '.config.env');
const envResult = dotenv.config({
  path: DOTENV_CONFIG_PATH,
});
if (envResult.error) {
  throw envResult.error;
}

export const NODE_ENV = process.env.NODE_ENV || 'development';

export const TWILIO_ENABLED = process.env.TWILIO_ENABLED === 'true';
export const TWILIO_SID = process.env.TWILIO_SID;
assert(TWILIO_SID, 'Missing environment variable: TWILIO_SID');
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
assert(TWILIO_AUTH_TOKEN, 'Missing environment variable: TWILIO_AUTH_TOKEN');
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
assert(TWILIO_PHONE_NUMBER, 'Missing environment variable: TWILIO_PHONE_NUMBER');
export const TO_PHONE_NUMBERS = process.env.TO_PHONE_NUMBERS;
assert(TO_PHONE_NUMBERS, 'Missing environment variable: TO_PHONE_NUMBERS');
export const BROWSER_LAT = Number(process.env.BROWSER_LAT);
assert(!Number.isNaN(BROWSER_LAT), 'Invalid environment variable: BROWSER_LAT');
export const BROWSER_LON = Number(process.env.BROWSER_LON);
assert(!Number.isNaN(BROWSER_LON), 'Invalid environment variable: BROWSER_LON');
export const BROWSER_TIMEZONEID = process.env.BROWSER_TIMEZONEID;
assert(BROWSER_TIMEZONEID, 'Missing environment variable: BROWSER_TIMEZONEID');

export const PRODUCT_URL_STRINGS: string[] = [];
export const PRODUCT_URLS: URL[] = [];
for (let url of process.env.PRODUCT_URLS?.split(',') || []) {
  url = url.trim();
  if (!url) continue;
  PRODUCT_URL_STRINGS.push(url);
  try {
    PRODUCT_URLS.push(new URL(url));
  } catch (e) {
    throw new Error(`Failed to parse product url: ${url}`, { cause: e });
  }
}
assert(PRODUCT_URLS.length === 0, 'Missing environment variable: PRODUCT_URLS');

console.info(`Loaded environment: ${DOTENV_CONFIG_PATH}`);
