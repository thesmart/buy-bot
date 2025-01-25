import * as fs from 'node:fs';
import { BROWSER_LAT, BROWSER_LON, BROWSER_TIMEZONEID } from '../consts.js';
import { BotBrowser, BotBrowserOpts, BotTab } from './browser.js';
import { promiseShutdown, sleep } from '../sleep.js';
import logger from '../logger.js';

const _browserOpts: BotBrowserOpts = {
  headless: false,
  geolocation: { latitude: BROWSER_LAT, longitude: BROWSER_LON },
  timeZoneId: BROWSER_TIMEZONEID,
};
function browserOpts(): BotBrowserOpts {
  return Object.assign({}, _browserOpts) as BotBrowserOpts;
}

export async function sessionStart(sessionFilePath?: string, sessionFileSavePath?: string) {
  let storageState: BotBrowserOpts['storageState'] | undefined;
  if (sessionFilePath) {
    storageState = JSON.parse(
      await fs.promises.readFile(sessionFilePath, 'utf-8'),
    ) as BotBrowserOpts['storageState'];
  }

  const browser = new BotBrowser(
    Object.assign({}, browserOpts(), { storageState, storageStateSavePath: sessionFileSavePath }),
  );

  try {
    const tab = await (await browser.start()).newTab();
    logger.info('Browser open. Login to your accounts and close the tab when done.');
    tab.page.once('close', async () => {
      logger.warn('Shutting down...');
      await sleep(1000);
      process.exit(0);
    });
    await promiseShutdown();
  } finally {
    await browser.dispose();
  }
}

export async function testStart() {
  const browser = new BotBrowser({ headless: false });
  try {
    const browser = await new BotBrowser(browserOpts()).start();
    const tabs: BotTab[] = [];
    tabs.push(await browser.newTab(new URL('https://www.whatismybrowser.com/')));
    tabs.push(await browser.newTab(new URL('https://browserleaks.com/geo')));
    tabs.push(await browser.newTab(new URL('https://www.browserscan.net/')));
    tabs.push(await browser.newTab(new URL('https://abrahamjuliot.github.io/creepjs/')));
    await promiseShutdown();
  } finally {
    await browser.dispose();
  }
}
