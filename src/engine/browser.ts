import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  chromium,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
  Page,
  Response,
} from 'patchright';
import iconv from 'iconv-lite';
import assert from 'assert';
import logger from '../logger.js';

// Create a temporary directory for user data
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `playwright-${Date.now()}`));
// Ensure directory has write permissions
fs.chmodSync(userDataDir, 0o750);

// matches content-type headers
const REGEX_HTML_MIME = /\s*\/(?:html|xhtml\+xml)(?:;|$)/;
const REGEX_ENCODING = /\s*([^;]*);\s*charset=([^;\s"]+)/i;

export interface BotBrowserOpts {
  // launch without a gui or not
  headless?: LaunchOptions['headless'];
  // immediately abort any matching resource route (asset url)
  abortLoading?: string | RegExp | ((url: URL) => boolean);
  storageState?: BrowserContextOptions['storageState'];
  storageStateSavePath?: string;
  geolocation?: { latitude: number; longitude: number };
  timeZoneId?: BrowserContextOptions['timezoneId'];
}

export class BotBrowser {
  options: BotBrowserOpts;
  context: BrowserContext | null = null;
  tab: BotTab | null = null;

  constructor(options: BotBrowserOpts = {}) {
    this.options = options;
  }

  async start(): Promise<BotBrowser> {
    if (this.context) {
      await this.context.close();
      const tab = this.tab;
      this.tab = null;
      await tab?.dispose();
    }

    console.info(this.options?.geolocation);
    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: this.options?.headless,
      args: [
        '--no-first-run',
        '--no-sandbox',
        '--enable-gpu-rasterization',
        '--enable-gpu-compositing',
        '--enable-gpu',
        '--enable-webgl',
        '--enable-accelerated-2d-canvas',
        '--enable-gpu-rasterization',
        '--enable-gpu-compositing',
        '--enable-gpu',
      ],
      acceptDownloads: false,
      geolocation: this.options?.geolocation
        ? {
            latitude: this.options.geolocation.latitude,
            longitude: this.options.geolocation.longitude,
            accuracy: 100,
          }
        : undefined,
      ignoreHTTPSErrors: true,
      permissions: this.options?.geolocation ? ['geolocation'] : undefined,
      serviceWorkers: 'block',
      // storageState: this.options?.storageState || undefined,
      reducedMotion: 'reduce',
      timezoneId: this.options?.timeZoneId || undefined,
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });

    if (this.options?.abortLoading) {
      this.context.route(this.options.abortLoading, (route) => route.abort());
    }

    return this;
  }

  /**
   * Open a new tab in the browser and wait for `domcontentloaded`.
   * @returns The page and response.
   */
  async newTab(url?: URL): Promise<BotTab> {
    assert(this.context, 'BotBrowser#start has not been called first.');
    const page = await this.context.newPage();
    if (url) {
      const response = await BotTab.goto(page, url);
      this.tab = new BotTab(page, response);
    } else {
      this.tab = new BotTab(page);
    }

    if (this.options?.storageStateSavePath) {
      const context = this.context;
      const options = this.options;
      this.tab.page.once('close', async () => {
        logger.info(`Tab closed. Saving session state: ${options.storageStateSavePath}`);
        await context.storageState({ path: options.storageStateSavePath });
      });
    }

    return this.tab;
  }

  /**
   * Clean up browser resources.
   */
  async dispose(): Promise<void> {
    const context = this.context;
    this.context = null;
    this.tab = null;
    for (const page of context?.pages() || []) {
      await page.close();
    }
    await context?.close();
  }
}

export class BotTab {
  page: Page;
  response: Response | null;
  charsetMeta: {
    contentLength: number;
    mime: string;
    charset: string;
  } | null = null;

  constructor(page: Page, response?: Response) {
    this.page = page;
    this.response = response || null;
    if (this.response) {
      this.parseHeaders();
    }
  }

  /**
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    await this.page.close();
  }

  /**
   * Navigate a Page to the given URL and wait for `domcontentloaded`.
   * @returns The response.
   */
  static async goto(page: Page, url: URL): Promise<Response> {
    let response: Response | null = null;
    try {
      // The method will not throw an error when any valid HTTP status code is returned.
      // The method will throw an error if:
      // there's an SSL error (e.g. in case of self-signed certificates).
      // target URL is invalid.
      // the timeout is exceeded during navigation.
      // the remote server does not respond or is unreachable.
      // the main resource failed to load.
      response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      if (!response) {
        throw new Error(`Page received no response: ${url.toString()}`);
      }
    } catch (e) {
      const we = new Error(`Page could not load in browser: ${url.toString()}`);
      we.cause = e;
      throw we;
    }

    if (!response.ok()) {
      throw new Error(
        `Page status (${response.status()}) "${response.statusText()}" for url: ${url.toString()}`,
      );
    }

    return response;
  }

  /**
   * Navigate the tab to the given URL and wait for `domcontentloaded`.
   * @returns The response.
   */
  async goto(url: URL): Promise<Response> {
    this.response = await BotTab.goto(this.page, url);
    this.parseHeaders();
    return this.response;
  }

  /**
   * Parse the response headers for byte length, mime, and a valid charset.
   */
  private parseHeaders() {
    this.charsetMeta = null;

    if (!this.response) {
      logger.debug('parseHeaders(): this.response missing. Race condition?');
      return;
    }

    const headers = this.response.headers();
    if (!headers['content-length']) {
      logger.debug('Content-Length header missing');
      return;
    }

    const contentLength: number = parseInt(headers['content-length'], 10);
    assert(
      !isNaN(contentLength) && isFinite(contentLength),
      `HTTPResponse has invalid "Content-length": ${headers['content-length']}`,
    );

    assert(headers['content-type'], 'HTTPResponse is missing header "Content-type".');
    const [match, mime, charset] = REGEX_ENCODING.exec(headers['content-type']) || [];
    assert(
      match && mime && REGEX_HTML_MIME.test(mime),
      'HTTPResponse has invalid header "Content-type".',
    );
    assert(
      charset && iconv.encodingExists(charset),
      `HTTPResponse charset "${charset}" is not supported by the operating system.`,
    );

    this.charsetMeta = { contentLength, mime, charset };
  }

  /**
   * Determine charset using the body's <meta/> tag.
   */
  private async parseBodyCharsetMetaTag(): Promise<string | null> {
    const metaHandle = await this.page.$('meta[charset], meta[http-equiv="Content-Type"]');
    if (!metaHandle) {
      return null;
    }

    let charset: string | null;
    try {
      charset = await this.page.evaluate(
        (meta) => meta.getAttribute['charset'] || null,
        metaHandle,
      );
    } finally {
      await metaHandle.dispose();
    }

    if (!charset) {
      return null;
    }

    assert(
      iconv.encodingExists(charset),
      `HTTPResponse charset "${charset}" is not supported by the operating system.`,
    );

    return charset;
  }

  async innerHTML(selector: string): Promise<string> {
    assert(this.charsetMeta, 'charsetMeta is missing. Has the page finished loading?');

    const elHandle = await this.page.$(selector);
    if (!elHandle) {
      throw new Error('No element match for selector.');
    }

    try {
      const html = (await this.page.evaluate((el) => el.innerHTML || '', elHandle)) as string;
      if (this.charsetMeta?.charset) {
        const sourceBuffer = iconv.encode(html, this.charsetMeta.charset);
        return iconv.decode(sourceBuffer, 'UTF-8');
      }
      return html;
    } finally {
      await elHandle.dispose();
    }
  }

  async innerText(selector: string): Promise<string> {
    assert(this.charsetMeta, 'charsetMeta is missing. Has the page finished loading?');

    const elHandle = await this.page.$(selector);
    if (!elHandle) {
      throw new Error('No element match for selector.');
    }

    try {
      const text = (await this.page.evaluate((el) => el.innerText || '', elHandle)) as string;
      if (this.charsetMeta?.charset) {
        const sourceBuffer = iconv.encode(text, this.charsetMeta.charset);
        return iconv.decode(sourceBuffer, 'UTF-8');
      }
      return text;
    } finally {
      await elHandle.dispose();
    }
  }
}
