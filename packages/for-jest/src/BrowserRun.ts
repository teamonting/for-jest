import { buildDriverService, buildWebDriver } from '@onting/browser/builder.js';
import { WebDriverSession } from '@onting/browser/WebDriverSession.js';
import stubHostImplementation from '@onting/stub/implementation.js';
import createDummyDriverService from './createDummyDriverService.ts';
import CustomEventTarget from './private/CustomEventTarget.ts';
import { BrowserRunConsoleEvent, type BrowserRunEventMap, BrowserRunLoadEvent } from './type.ts';

type BrowserRunInit = {
  webDriverURL?: string | undefined;
};

class BrowserRun extends CustomEventTarget<BrowserRunEventMap> {
  constructor(url: string, init?: BrowserRunInit | undefined) {
    super();

    this.#asyncConstructor(url, { webDriverURL: init?.webDriverURL });

    this.#successPromise = new Promise((resolve, reject) => {
      this.addEventListener('error', ({ error }) => reject(error), { once: true });
      this.addEventListener('load', ({ data }) => resolve(data), { once: true });
    });
  }

  async #asyncConstructor(url: string, { webDriverURL }: { webDriverURL: string | undefined }) {
    try {
      await using driverService: Awaited<ReturnType<typeof buildDriverService>> = webDriverURL
        ? createDummyDriverService(webDriverURL)
        : await buildDriverService('chrome', {
            pipeStdio: false,
            useWindowsBinary: false
          });

      await using webDriver = await buildWebDriver('chrome', await driverService.start());

      using session = new WebDriverSession(webDriver, stubHostImplementation);

      const promise = new Promise<readonly unknown[]>((resolve, reject) => {
        session.addEventListener('close', () => reject(new Error('Browser closed without result')), { once: true });
        session.addEventListener('console', ({ data, method, timestamp }) => {
          this.dispatchEvent(new BrowserRunConsoleEvent('console', { data, method, timestamp }));

          if (data[0] && typeof data[0] === 'string') {
            const [data0] = data;

            if (data0 === '🆗' || data0 === '🈴') {
              resolve(data.slice(1));
            } else if (data0 === '🆖') {
              reject(new Error('Test failed', { cause: data.slice(1) }));
            }
          }
        });
        session.addEventListener('error', ({ error }) => reject(error), { once: true });
      });

      await webDriver.navigate().to(url);

      const data = await promise;

      this.dispatchEvent(new BrowserRunLoadEvent('load', { data }));
    } catch (error) {
      this.dispatchEvent(new ErrorEvent('error', { error }));
    } finally {
      this.dispatchEvent(new Event('loadend'));
    }
  }

  #successPromise: Promise<readonly unknown[]>;

  get successPromise(): Promise<readonly unknown[]> {
    return this.#successPromise;
  }
}

export default BrowserRun;
