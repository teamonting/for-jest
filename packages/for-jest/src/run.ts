import { buildDriverService, buildWebDriver } from '@onting/browser/builder.js';
import { WebDriverSession } from '@onting/browser/WebDriverSession.js';
import stubHostImplementation from '@onting/stub/implementation.js';
import createDummyDriverService from './createDummyDriverService.ts';

async function run(
  url: string,
  init?:
    | {
        pipeConsole?: boolean | undefined;
        webDriverURL?: string | undefined;
      }
    | undefined
): Promise<void> {
  await using driverService: Awaited<ReturnType<typeof buildDriverService>> = init?.webDriverURL
    ? createDummyDriverService(init.webDriverURL)
    : await buildDriverService('chrome', {
        pipeStdio: false,
        useWindowsBinary: false
      });

  await using webDriver = await buildWebDriver('chrome', await driverService.start());

  using session = new WebDriverSession(webDriver, stubHostImplementation);

  const promise = new Promise<void>((resolve, reject) => {
    session.addEventListener('close', () => reject(new Error('Browser closed without result')), { once: true });
    session.addEventListener('console', ({ args, method, timestamp }) => {
      if (init?.pipeConsole) {
        console.log(method, new Date(timestamp).toISOString(), ...args);
      }

      if (args[0] && typeof args[0] === 'string') {
        const [arg0] = args;

        if (arg0.startsWith('🆗') || arg0.startsWith('🈴')) {
          resolve();
        } else if (arg0.startsWith('🆖')) {
          reject(new Error(`Test failed with "${arg0.slice(1).trim()}"`));
        }
      }
    });
    session.addEventListener('error', ({ error }) => reject(error), { once: true });
  });

  await webDriver.navigate().to(url);

  await promise;
}

export default run;
