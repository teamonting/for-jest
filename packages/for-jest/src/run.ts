import { buildDriverService, buildWebDriver } from '@onting/browser/builder.js';
import { WebDriverSession } from '@onting/browser/WebDriverSession.js';
import stubHostImplementation from '@onting/stub/implementation';

async function run(
  url: string,
  init?:
    | {
        pipeConsole?: boolean | undefined;
        webDriverURL?: string | undefined;
      }
    | undefined
): Promise<void> {
  let driverService: Awaited<ReturnType<typeof buildDriverService>> | undefined;
  let serverURL: string;

  if (init?.webDriverURL) {
    serverURL = init.webDriverURL;
  } else {
    driverService = await buildDriverService('chrome', {
      pipeStdio: false,
      useWindowsBinary: false
    });

    serverURL = await driverService.start();
  }

  try {
    const webDriver = await buildWebDriver('chrome', serverURL);

    try {
      const session = new WebDriverSession(webDriver, stubHostImplementation);

      const promise = new Promise<void>((resolve, reject) => {
        session.addEventListener('close', () => reject(new Error('Browser closed without result')));
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
        session.addEventListener('error', ({ error }) => reject(error));
      });

      await webDriver.navigate().to(url);

      await promise;
    } finally {
      try {
        await webDriver.quit();
      } catch (error) {
        console.error('Failed to close WebDriver session.', error);
      }
    }
  } finally {
    try {
      await driverService?.kill();
    } catch (error) {
      console.error('Failed to close WebDriver service.', error);
    }
  }
}

export default run;
